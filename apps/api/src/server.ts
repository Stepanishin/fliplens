import Fastify from 'fastify';
import { z } from 'zod';
import {
  CATEGORIES,
  CONDITIONS,
  CURRENCIES,
  FEE_PRESETS,
  money,
  PRICING_ALGORITHM_VERSION,
  valuate,
  type FeePresetId,
  type NormalizedProduct,
} from '@fliplens/core';
import { EbayAdapter, EcbFxService } from '@fliplens/sources';
import { OpenAIVisionProvider, RecognitionError, gtinSearchVariants, normalizeGtin } from '@fliplens/recognition';
import { registerBenchmarkRoutes } from './benchmark.js';
import { initPersistence, type Persistence } from './persistence.js';

// Up to 3 photos resized to ~1MP on the client: a few MB of base64 at most.
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, bodyLimit: 15 * 1024 * 1024 });

const ebay = new EbayAdapter({
  clientId: process.env.EBAY_CLIENT_ID ?? '',
  clientSecret: process.env.EBAY_CLIENT_SECRET ?? '',
  env: process.env.EBAY_ENV === 'sandbox' ? 'sandbox' : 'production',
});
const fx = new EcbFxService();
const vision = new OpenAIVisionProvider({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  ...(process.env.OPENAI_VISION_MODEL && { model: process.env.OPENAI_VISION_MODEL }),
});
/** Barcode flow only reads listing titles: a cheap text model is enough. */
const titleIdentifier = new OpenAIVisionProvider({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  model: process.env.OPENAI_TEXT_MODEL ?? 'gpt-6-luna',
});

registerBenchmarkRoutes(app);
const store: Persistence = await initPersistence(process.env.DATABASE_URL, app.log);
store.registerRoutes(app);

const presetIds = Object.keys(FEE_PRESETS) as [FeePresetId, ...FeePresetId[]];

const ValuationBody = z.object({
  product: z.object({
    category: z.enum(CATEGORIES),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    capacity: z.string().trim().min(1).optional(),
    mount: z.string().trim().min(1).optional(),
    gtin: z.string().regex(/^\d{8,14}$/).optional(),
    excludeModels: z.array(z.string().trim().min(1)).max(10).optional(),
  }),
  condition: z.enum(CONDITIONS),
  purchasePrice: z.number().min(0).max(100_000),
  currency: z.enum(CURRENCIES).default('EUR'),
  preset: z.enum(presetIds).default('ebay_de_private'),
  shippingCost: z.number().min(0).max(1000).default(6),
  packagingCost: z.number().min(0).max(100).optional(),
  targetRoiPct: z.number().min(0).max(1000).optional(),
  /** 1 for manually entered products; the chosen candidate's confidence for photo recognition. */
  identificationConfidence: z.number().min(0).max(1).default(1),
  recognitionModelVersion: z.string().max(200).optional(),
  inputMethod: z.enum(['photo', 'barcode', 'manual']).default('manual'),
  identificationId: z.string().uuid().optional(),
  chosenCandidateIndex: z.number().int().min(0).max(10).optional(),
  gtin: z.string().regex(/^\d{8,14}$/).optional(),
});

app.get('/api/health', async () => ({
  ok: true,
  pricingAlgorithmVersion: PRICING_ALGORITHM_VERSION,
  sources: { ebay: ebay.isConfigured() },
  vision: { configured: vision.isConfigured(), provider: vision.id },
  db: store.status,
}));

const MAX_IMAGE_CHARS = 5 * 1024 * 1024;
const IdentifyBody = z.object({
  images: z
    .array(z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'must be a base64 JPEG/PNG/WEBP data URL').max(MAX_IMAGE_CHARS))
    .min(1)
    .max(3),
});

app.post('/api/identify', async (req, reply) => {
  const parsed = IdentifyBody.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues.map((i) => i.message) });
  if (!vision.isConfigured()) {
    return reply.code(409).send({ error: 'vision_not_configured', message: 'Set OPENAI_API_KEY in .env to enable photo recognition' });
  }
  try {
    // Images are forwarded to the provider and never stored by the API.
    const result = await vision.identify(parsed.data.images.map((dataUrl) => ({ dataUrl })), { requestId: req.id });
    req.log.info(
      {
        event: result.candidates.length > 0 ? 'product_detected' : 'product_not_detected',
        provider: result.modelVersion,
        images: parsed.data.images.length,
        top: result.candidates[0] ? `${result.candidates[0].brand} ${result.candidates[0].model}` : null,
        confidence: result.candidates[0]?.confidence ?? null,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: result.costUsd ?? null,
        latencyMs: result.latencyMs,
      },
      'identify',
    );
    const identificationId = await store.recordIdentification(req, {
      method: 'photo',
      imageCount: parsed.data.images.length,
      result,
      provider: 'openai',
      model: vision.id.replace('openai:', ''),
    });
    return { ...result, identificationId };
  } catch (e) {
    if (e instanceof RecognitionError) {
      req.log.error({ event: 'recognition_failed', kind: e.kind }, e.message);
      return reply.code(e.kind === 'not_configured' ? 409 : 502).send({ error: 'recognition_failed', kind: e.kind, message: e.message });
    }
    throw e;
  }
});

const BarcodeBody = z.object({ gtin: z.string().trim().min(8).max(20) });

app.post('/api/identify/barcode', async (req, reply) => {
  const parsed = BarcodeBody.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', message: 'gtin required' });
  const gtin = normalizeGtin(parsed.data.gtin);
  if (!gtin) return reply.code(400).send({ error: 'invalid_gtin', message: `"${parsed.data.gtin}" is not a valid EAN/UPC (check digit or length)` });
  if (!ebay.isConfigured()) return reply.code(409).send({ error: 'source_not_configured', message: 'eBay keys are not configured' });
  if (!titleIdentifier.isConfigured()) return reply.code(409).send({ error: 'vision_not_configured', message: 'Set OPENAI_API_KEY in .env' });

  const found = await ebay.titlesForGtin(gtinSearchVariants(gtin));
  for (const w of found.warnings) req.log.warn({ event: 'source_fetch_failed', site: w.site }, w.message);
  if (found.titles.length === 0) {
    req.log.info({ event: 'barcode_not_found', gtin }, 'barcode');
    return reply.code(404).send({ error: 'gtin_not_found', gtin, message: 'No eBay listings carry this barcode. Try a photo or enter the model.' });
  }
  try {
    const result = await titleIdentifier.identifyFromListingTitles(gtin, found.titles);
    req.log.info(
      { event: 'barcode_scanned', gtin, titles: found.titles.length, top: result.candidates[0] ? `${result.candidates[0].brand} ${result.candidates[0].model}` : null, costUsd: result.costUsd ?? null },
      'barcode',
    );
    const identificationId = await store.recordIdentification(req, {
      method: 'barcode',
      gtin,
      imageCount: 0,
      result,
      provider: 'openai',
      model: titleIdentifier.id.replace('openai:', ''),
    });
    return { ...result, gtin, listingCount: found.titles.length, sites: found.sites, identificationId };
  } catch (e) {
    if (e instanceof RecognitionError) {
      req.log.error({ event: 'recognition_failed', kind: e.kind }, e.message);
      return reply.code(502).send({ error: 'recognition_failed', kind: e.kind, message: e.message });
    }
    throw e;
  }
});

app.get('/api/presets', async () =>
  Object.entries(FEE_PRESETS).map(([id, p]) => ({
    id,
    marketplace: p.marketplace,
    sellerType: p.sellerType,
    percentageFeeBp: p.percentageFeeBp,
    sellerPaysShipping: p.sellerPaysShipping,
    verified: 'lastVerifiedAt' in p,
  })),
);

app.post('/api/valuation', async (req, reply) => {
  const parsed = ValuationBody.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues });
  const b = parsed.data;

  const product: NormalizedProduct = stripUndefined(b.product);
  if (!ebay.isConfigured()) {
    return reply.code(409).send({ error: 'source_not_configured', message: 'eBay keys are not configured on the server (.env)' });
  }

  const [search, rates] = await Promise.all([ebay.searchProduct(product, { requestId: req.id }), fx.latest()]);
  for (const w of search.warnings) req.log.warn({ source: w.source, site: w.site, event: 'source_fetch_failed' }, w.message);
  if (rates.source !== 'ecb') req.log.warn({ event: 'fx_fallback' }, 'ECB unreachable, using static FX rates');

  const result = valuate({
    product,
    targetCondition: b.condition,
    items: search.items,
    targetCurrency: b.currency,
    fx: rates,
    now: new Date(),
    identificationConfidence: b.identificationConfidence,
    purchasePrice: money(b.purchasePrice, b.currency),
    fees: FEE_PRESETS[b.preset],
    shippingCost: money(b.shippingCost, b.currency),
    ...(b.packagingCost !== undefined && { packagingCost: money(b.packagingCost, b.currency) }),
    ...(b.targetRoiPct !== undefined && { targetRoiPct: b.targetRoiPct }),
    ...(b.recognitionModelVersion !== undefined && { recognitionModelVersion: b.recognitionModelVersion }),
  });

  req.log.info(
    {
      event: result.status === 'ok' ? 'valuation_completed' : 'valuation_insufficient_data',
      source: 'ebay',
      items: search.items.length,
      calls: search.calls,
      cacheHits: search.cacheHits,
      ...(result.status === 'ok' && { decision: result.decision.decision, confidence: result.estimate.confidence.score }),
    },
    'valuation',
  );

  const scanId = await store.recordValuation(req, {
    body: b,
    product,
    result,
    search,
    fx: rates,
    feeProfileId: FEE_PRESETS[b.preset].id,
  });

  return {
    scanId,
    source: 'ebay',
    dataFetchedAt: search.oldestFetchedAt?.toISOString() ?? null,
    sourceWarnings: search.warnings,
    fx: { rateDate: rates.rateDate, source: rates.source },
    feePreset: { id: b.preset, verified: 'lastVerifiedAt' in FEE_PRESETS[b.preset] },
    result,
  };
});

function stripUndefined<T extends object>(o: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> };
}

const port = Number(process.env.API_PORT ?? 8787);
app.listen({ port, host: '127.0.0.1' }).catch((err: unknown) => {
  app.log.error(err);
  process.exit(1);
});
