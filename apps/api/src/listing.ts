import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FEE_PRESETS, PLANS, type FeePresetId } from '@fliplens/core';
import { aiCostThisMonth, getInventory, getSettings, listingsThisMonth, recordUsage, type Db } from '@fliplens/db';
import { RecognitionError, type OpenAIListingWriter } from '@fliplens/recognition';
import type { Quota } from './billing.js';

/** Listing generator (spec Phase 9), paid plans only. Text to copy; we never post on the user's behalf. */

const EBAY: Record<string, string> = { DE: 'ebay.de', AT: 'ebay.at', FR: 'ebay.fr', IT: 'ebay.it', ES: 'ebay.es', NL: 'ebay.nl', BE: 'befr.ebay.be', IE: 'ebay.ie', PL: 'ebay.pl', GB: 'ebay.co.uk', CH: 'ebay.ch' };
const VINTED: Record<string, string> = {
  AT: 'vinted.at', BE: 'vinted.be', CZ: 'vinted.cz', DE: 'vinted.de', DK: 'vinted.dk', ES: 'vinted.es', FI: 'vinted.fi', FR: 'vinted.fr', GR: 'vinted.gr',
  HR: 'vinted.hr', HU: 'vinted.hu', IE: 'vinted.ie', IT: 'vinted.it', LT: 'vinted.lt', LU: 'vinted.lu', NL: 'vinted.nl', PL: 'vinted.pl', PT: 'vinted.pt',
  RO: 'vinted.ro', SE: 'vinted.se', SI: 'vinted.si', SK: 'vinted.sk', GB: 'vinted.co.uk',
};
/** Price to ask, relative to our expected sale price: room for offers on classifieds, a bit on Vinted. */
const PRICE_FACTOR = { ebay: 1.0, vinted: 1.05, kleinanzeigen: 1.1 } as const;

const Body = z.object({
  inventoryId: z.string().uuid(),
  marketplace: z.enum(['ebay', 'vinted', 'kleinanzeigen']),
  language: z.string().regex(/^[a-z]{2}$/),
  notes: z.string().trim().max(600).optional(),
});

function sellUrl(m: 'ebay' | 'vinted' | 'kleinanzeigen', country: string): string {
  if (m === 'ebay') return `https://www.${EBAY[country] ?? 'ebay.de'}/sl/sell`;
  if (m === 'vinted') return `https://www.${VINTED[country] ?? 'vinted.de'}/items/new`;
  return 'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html';
}

export function registerListingRoutes(
  app: FastifyInstance,
  deps: {
    db: Db;
    writer: OpenAIListingWriter;
    requireSignedIn: (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined>;
    quota?: (userId: string) => Promise<Quota>;
  },
): void {
  app.post('/api/listing', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return;
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const b = parsed.data;
    if (deps.quota) {
      const q = await deps.quota(uid);
      if (q.plan === 'free') return reply.code(402).send({ error: 'upgrade_required', message: 'The listing generator is part of Pro and Reseller.' });
      // As many listings per month as checks; and never past the hard AI spend stop.
      const [listings, spent] = await Promise.all([listingsThisMonth(deps.db, uid), aiCostThisMonth(deps.db, uid)]);
      if (listings >= q.limit || spent >= PLANS[q.plan].aiBudgetMicroUsd * 2) {
        return reply.code(402).send({ error: 'listing_limit', message: `You reached this month's listing limit of your ${q.plan} plan.` });
      }
    }
    if (!deps.writer.isConfigured()) return reply.code(409).send({ error: 'not_configured', message: 'OPENAI_API_KEY missing' });
    const item = await getInventory(deps.db, uid, b.inventoryId);
    if (!item) return reply.code(404).send({ error: 'not_found' });
    const settings = await getSettings(deps.db, uid);
    const presetId = (settings?.feePreset ?? 'ebay_de_private') as FeePresetId;
    const sellerType = FEE_PRESETS[presetId]?.resolve('good', 'other').sellerType ?? 'private';
    const country = settings?.country ?? 'DE';
    try {
      const text = await deps.writer.write({
        marketplace: b.marketplace,
        language: b.language,
        brand: item.brand,
        model: item.model,
        capacity: item.capacity,
        category: item.category,
        condition: item.condition,
        ...(b.notes && { notes: b.notes }),
        sellerType,
      });
      await recordUsage(deps.db, {
        userId: uid,
        kind: 'text_llm',
        provider: 'openai',
        model: text.modelVersion,
        inputTokens: text.usage.inputTokens,
        outputTokens: text.usage.outputTokens,
        ...(text.costUsd !== undefined && { costUsd: text.costUsd }),
      });
      req.log.info({ event: 'listing_generated', marketplace: b.marketplace, language: b.language, costUsd: text.costUsd ?? null }, 'listing');
      const suggested = item.expectedSaleMinor ? Math.round((item.expectedSaleMinor * PRICE_FACTOR[b.marketplace]) / 100) * 100 : null;
      return {
        title: text.title,
        description: text.description,
        conditionText: text.conditionText,
        keywords: text.keywords,
        suggestedPriceMinor: suggested,
        marketplace: b.marketplace,
        sellUrl: sellUrl(b.marketplace, country),
      };
    } catch (e) {
      if (e instanceof RecognitionError) return reply.code(502).send({ error: 'listing_failed', message: e.message });
      throw e;
    }
  });
}
