import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FEE_PRESETS, feeProfileIn, marketFor, money, resolveFeeProfile, valuate, type FeePresetId, type NormalizedProduct } from '@fliplens/core';
import { RecognitionError, type IdentificationResult, type OpenAIShelfScanner, type ShelfItem, type ShelfScan } from '@fliplens/recognition';
import type { EbayAdapter, EcbFxService } from '@fliplens/sources';
import type { Persistence } from './persistence.js';

/**
 * "Scan the table": one photo -> the products on it, each valued like a normal check (real eBay listings, no price
 * given, so the answer is the most worth paying). Counts one check per valued item, at most MAX_VALUED per photo.
 */
const MAX_VALUED = 6;
const MIN_CONFIDENCE = 0.5;
const presetIds = Object.keys(FEE_PRESETS) as [FeePresetId, ...FeePresetId[]];

const Body = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(5 * 1024 * 1024),
  preset: z.enum(presetIds).default('ebay_de_private'),
  shippingCost: z.number().min(0).max(1000).default(6),
  targetRoiPct: z.number().min(0).max(1000).default(40),
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
});

type Outcome =
  | { status: 'ok'; scanId?: string | undefined; maxBuyMinor: number; expectedMinor: number; fastMinor: number; confidence: 'high' | 'medium' | 'low'; count: number }
  | { status: 'insufficient'; scanId?: string | undefined; count: number }
  | { status: 'not_checked'; reason: 'quota' | 'low_confidence' | 'limit' | 'unavailable' };

export function registerShelfRoute(
  app: FastifyInstance,
  deps: { store: Persistence; ebay: EbayAdapter; fx: EcbFxService; scanner: OpenAIShelfScanner; cheapModel: string },
): void {
  const { store, ebay, fx, scanner } = deps;

  app.post('/api/scan/shelf', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const b = parsed.data;
    if (!(await store.requireMember(req, reply))) return reply;
    if (!(await store.requireAccount(req, reply, 'identification'))) return reply;
    // No checks left: say so before spending on recognition.
    const before = await store.quota(req);
    if (before && before.remaining <= 0) {
      return reply.code(402).send({ error: 'quota_exceeded', message: `You used all ${before.limit} checks of your ${before.plan} plan this month.`, quota: before });
    }
    if (!scanner.isConfigured()) return reply.code(409).send({ error: 'vision_not_configured' });
    if (!ebay.isConfigured()) return reply.code(409).send({ error: 'source_not_configured' });

    let scan: ShelfScan;
    try {
      const cheap = (await store.aiMode(req)) === 'cheap';
      scan = await scanner.scan(b.image, cheap ? { model: deps.cheapModel } : {});
    } catch (e) {
      if (e instanceof RecognitionError) return reply.code(502).send({ error: 'recognition_failed', kind: e.kind, message: e.message });
      throw e;
    }
    // Recorded like a photo recognition: counts against the recognition limit and the AI budget.
    const asResult: IdentificationResult = {
      candidates: scan.items.slice(0, 3).map((i) => ({ category: i.category, brand: i.brand, model: i.model, confidence: i.confidence, ...(i.capacity && { capacity: i.capacity }) })),
      confusableModels: [],
      identifyingText: scan.items.map((i) => i.label),
      provider: 'openai',
      modelVersion: scan.modelVersion,
      usage: scan.usage,
      ...(scan.costUsd !== undefined && { costUsd: scan.costUsd }),
      latencyMs: scan.latencyMs,
    };
    const identificationId = await store.recordIdentification(req, { method: 'photo', imageCount: 1, result: asResult, provider: 'openai', model: scan.modelVersion.replace(/^openai:|@.*$/g, '') });

    const quota = await store.quota(req);
    let budget = Math.min(MAX_VALUED, quota ? quota.remaining : MAX_VALUED);
    const plan = scan.items.map((item) => {
      if (item.confidence < MIN_CONFIDENCE) return { item, go: false as const, reason: 'low_confidence' as const };
      if (budget <= 0) return { item, go: false as const, reason: (quota && quota.remaining <= 0 ? 'quota' : 'limit') as 'quota' | 'limit' };
      budget--;
      return { item, go: true as const };
    });

    const rates = await fx.latest();
    const market = marketFor(b.country, b.preset);
    const fees = (category: NormalizedProduct['category']) => feeProfileIn(resolveFeeProfile(b.preset, 'good', category), market.currency, rates);

    async function valueItem(item: ShelfItem): Promise<Outcome> {
      const product: NormalizedProduct = {
        category: item.category,
        brand: item.brand,
        model: item.model,
        ...(item.capacity && { capacity: item.capacity }),
      } as NormalizedProduct;
      const search = await ebay.searchProduct(product, { requestId: req.id, ...(market.sites && { sites: market.sites }) });
      if (search.items.length === 0 && search.warnings.some((w) => w.site)) return { status: 'not_checked', reason: 'unavailable' };
      const fee = fees(product.category);
      const at = (price: number) =>
        valuate({
          product,
          targetCondition: 'good',
          items: search.items,
          targetCurrency: market.currency,
          fx: rates,
          now: new Date(),
          identificationConfidence: item.confidence,
          purchasePrice: money(price, market.currency),
          fees: fee,
          shippingCost: money(b.shippingCost, market.currency),
          targetRoiPct: b.targetRoiPct,
          recognitionModelVersion: scan.modelVersion,
        });
      let price = 0;
      let result = at(0);
      if (result.status === 'ok' && result.maxBuyPrice) {
        price = Math.max(0, Math.floor(result.maxBuyPrice.amountMinor / 100));
        result = at(price);
      }
      const scanId = await store.recordValuation(req, {
        body: { inputMethod: 'photo', ...(identificationId && { identificationId }), condition: 'good', purchasePrice: price, priceProvided: false, currency: market.currency, recognitionModelVersion: scan.modelVersion },
        product,
        result,
        search,
        fx: rates,
        feeProfileId: fee.id,
      });
      if (result.status !== 'ok') return { status: 'insufficient', scanId, count: result.status === 'insufficient_data' ? result.includedCount : 0 };
      const e = result.estimate;
      return {
        status: 'ok',
        scanId,
        maxBuyMinor: result.maxBuyPrice?.amountMinor ?? 0,
        expectedMinor: e.expected.amountMinor,
        fastMinor: e.fast.amountMinor,
        confidence: e.confidence.level,
        count: e.distribution.count,
      };
    }

    // Three at a time: each value check calls eBay on five sites.
    const outcomes: Outcome[] = new Array(plan.length);
    let next = 0;
    async function worker() {
      while (next < plan.length) {
        const i = next++;
        const p = plan[i]!;
        outcomes[i] = p.go ? await valueItem(p.item).catch((): Outcome => ({ status: 'not_checked', reason: 'unavailable' })) : { status: 'not_checked', reason: p.reason };
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    const valued = outcomes.filter((o) => o.status !== 'not_checked').length;
    req.log.info({ event: 'shelf_scan', items: scan.items.length, valued, costUsd: scan.costUsd ?? null }, 'shelf scan');
    return {
      items: scan.items.map((item, i) => ({ label: item.label, brand: item.brand, model: item.model, category: item.category, capacity: item.capacity, box: item.box, recognition: item.confidence, ...outcomes[i]! })),
      valued,
      quota: await store.quota(req),
    };
  });
}
