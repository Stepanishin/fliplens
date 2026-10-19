import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CONDITIONS, convert, feeProfileIn, money, resolveFeeProfile, valuate, type Condition, type CurrencyCode, type FeePresetId } from '@fliplens/core';
import type { EbayAdapter, EcbFxService } from '@fliplens/sources';
import type { Persistence } from './persistence.js';

/**
 * "UK vs EU" (ADR-026): the same checked item valued on eBay.co.uk (pounds) and on the five EU eBay sites (euro),
 * side by side and converted both ways, so a reseller who buys in one market sees where it sells for more.
 * Only for an item the user already checked (by scan id), so it never replaces a check; it costs no check.
 * Cross-border shipping, customs and VAT are not included and the answer says so.
 */

const MARKETS: readonly { id: 'GB' | 'EU'; label: string; sites: readonly string[] | undefined; currency: CurrencyCode; preset: FeePresetId }[] = [
  { id: 'GB', label: 'eBay.co.uk', sites: ['EBAY_GB'], currency: 'GBP', preset: 'ebay_uk_private' },
  { id: 'EU', label: 'eBay DE, FR, IT, ES, NL', sites: undefined, currency: 'EUR', preset: 'ebay_de_private' },
];

const Body = z.object({
  scanId: z.string().uuid(),
  /** Shipping in the user's own currency (as in their settings). */
  shippingCost: z.number().min(0).max(1000).default(6),
  shippingCurrency: z.enum(['EUR', 'GBP']).default('EUR'),
  targetRoiPct: z.number().min(0).max(1000).default(40),
});

export function registerCompareRoute(app: FastifyInstance, deps: { store: Persistence; ebay: EbayAdapter; fx: EcbFxService }): void {
  app.post('/api/valuation/compare', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const b = parsed.data;
    const scan = await deps.store.ownScan(req, b.scanId);
    if (!scan) return reply.code(404).send({ error: 'not_found' });
    if (!deps.ebay.isConfigured()) return reply.code(409).send({ error: 'source_not_configured' });
    const condition = (CONDITIONS as readonly string[]).includes(scan.condition) ? (scan.condition as Condition) : 'good';
    const rates = await deps.fx.latest();
    const conv = (minor: number, from: CurrencyCode, to: CurrencyCode) => (from === to ? minor : convert({ amountMinor: minor, currency: from }, to, rates).amount.amountMinor);

    const markets = await Promise.all(
      MARKETS.map(async (m) => {
        const search = await deps.ebay.searchProduct(scan.product, { requestId: req.id, ...(m.sites && { sites: m.sites }) });
        if (search.items.length === 0 && search.warnings.some((w) => w.site)) return { id: m.id, label: m.label, currency: m.currency, status: 'unavailable' as const };
        const result = valuate({
          product: scan.product,
          targetCondition: condition,
          items: search.items,
          targetCurrency: m.currency,
          fx: rates,
          now: new Date(),
          identificationConfidence: 1,
          purchasePrice: money(0, m.currency),
          fees: feeProfileIn(resolveFeeProfile(m.preset, condition, scan.product.category), m.currency, rates),
          shippingCost: { amountMinor: conv(Math.round(b.shippingCost * 100), b.shippingCurrency, m.currency), currency: m.currency },
          targetRoiPct: b.targetRoiPct,
        });
        if (result.status !== 'ok') return { id: m.id, label: m.label, currency: m.currency, status: 'insufficient' as const, count: result.includedCount };
        const e = result.estimate;
        const expected = e.expected.amountMinor;
        return {
          id: m.id,
          label: m.label,
          currency: m.currency,
          status: 'ok' as const,
          expectedMinor: expected,
          fastMinor: e.fast.amountMinor,
          maxBuyMinor: result.maxBuyPrice?.amountMinor ?? 0,
          count: e.distribution.count,
          confidence: e.confidence.level,
          /** Same amounts in the other currency, for the side-by-side view. */
          expectedEurMinor: conv(expected, m.currency, 'EUR'),
          expectedGbpMinor: conv(expected, m.currency, 'GBP'),
        };
      }),
    );

    const ok = markets.filter((m): m is Extract<(typeof markets)[number], { status: 'ok' }> => m.status === 'ok');
    let better: { id: 'GB' | 'EU'; diffEurMinor: number; diffGbpMinor: number; pct: number } | null = null;
    if (ok.length === 2) {
      const [a, c] = ok[0]!.expectedEurMinor >= ok[1]!.expectedEurMinor ? [ok[0]!, ok[1]!] : [ok[1]!, ok[0]!];
      const diff = a.expectedEurMinor - c.expectedEurMinor;
      better = { id: a.id, diffEurMinor: diff, diffGbpMinor: conv(diff, 'EUR', 'GBP'), pct: c.expectedEurMinor > 0 ? Math.round((diff / c.expectedEurMinor) * 100) : 0 };
    }
    req.log.info({ event: 'market_compare', better: better?.id ?? null, pct: better?.pct ?? null }, 'UK vs EU compare');
    return {
      markets,
      better,
      fx: { gbpPerEur: conv(10000, 'EUR', 'GBP') / 10000, rateDate: rates.rateDate, source: rates.source },
    };
  });
}
