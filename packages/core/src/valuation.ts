import { DEFAULT_PRICING_CONFIG, type PricingConfig } from './config.js';
import { decide, type DecisionResult, type Liquidity } from './decision.js';
import { convert, formatMoney, type CurrencyCode, type FxRateTable, type Money } from './money.js';
import type { MarketplaceItem } from './types.js';
import { estimatePrice, type InsufficientData, type PriceEstimate, type PriceEstimateInput } from './pricing.js';
import { computeProfit, maxBuyPrice, type FeeProfile, type ProfitBreakdown } from './profit.js';

export interface ValuationInput extends Omit<PriceEstimateInput, 'config'> {
  readonly purchasePrice: Money;
  readonly fees: FeeProfile;
  readonly shippingCost: Money;
  readonly packagingCost?: Money;
  readonly targetRoiPct?: number;
  readonly liquidity?: Liquidity;
  readonly recognitionModelVersion?: string;
  readonly config?: PricingConfig;
  /**
   * Taken off the estimated sale prices before profit. eBay comparables are total buyer prices (item + shipping);
   * on Vinted or for local pickup the buyer pays shipping separately or none, so the item fetches about that much less.
   */
  readonly salePriceDeduction?: Money;
}

export interface Valuation {
  readonly status: 'ok';
  readonly pricingAlgorithmVersion: string;
  readonly recognitionModelVersion?: string;
  readonly estimate: PriceEstimate;
  /** Profit scenarios at fast / expected / high sale price. */
  readonly profit: { readonly fast: ProfitBreakdown; readonly expected: ProfitBreakdown; readonly high: ProfitBreakdown };
  readonly maxBuyPrice?: Money;
  readonly liquidity?: Liquidity;
  readonly decision: DecisionResult;
}

export function valuate(input: ValuationInput): Valuation | InsufficientData {
  const cfg = input.config ?? DEFAULT_PRICING_CONFIG;
  const raw = estimatePrice({ ...input, config: cfg });
  if (raw.status !== 'ok') return raw;
  const cut = input.salePriceDeduction?.amountMinor ?? 0;
  // Whole units like the estimate; never below a token 1.
  const less = (m: Money): Money => ({ ...m, amountMinor: Math.max(100, Math.round((m.amountMinor - cut) / 100) * 100) });
  const estimate = cut > 0 ? { ...raw, fast: less(raw.fast), expected: less(raw.expected), high: less(raw.high) } : raw;

  const scenario = (salePrice: Money): ProfitBreakdown =>
    computeProfit({
      salePrice,
      purchasePrice: input.purchasePrice,
      fees: input.fees,
      shippingCost: input.shippingCost,
      ...(input.packagingCost && { packagingCost: input.packagingCost }),
    });
  const profit = { fast: scenario(estimate.fast), expected: scenario(estimate.expected), high: scenario(estimate.high) };

  const decided = decide(
    {
      profit: profit.expected.profit,
      roiPct: profit.expected.roiPct,
      confidence: estimate.confidence,
      includedCount: estimate.distribution.count,
      dataKind: estimate.dataKind,
      ...(input.liquidity && { liquidity: input.liquidity }),
      salePrice: estimate.expected,
      fastProfit: profit.fast.profit,
      fastRoiPct: profit.fast.roiPct,
    },
    cfg,
  );
  const decision = cut > 0 && input.salePriceDeduction
    ? { ...decided, factors: [...decided.factors, `buyer pays shipping separately: typical shipping of ${formatMoney(input.salePriceDeduction)} taken off the eBay prices`] }
    : decided;

  return {
    status: 'ok',
    pricingAlgorithmVersion: cfg.version,
    ...(input.recognitionModelVersion !== undefined && { recognitionModelVersion: input.recognitionModelVersion }),
    estimate,
    profit,
    ...(input.targetRoiPct !== undefined && { maxBuyPrice: maxBuyPrice(profit.expected.net, input.targetRoiPct) }),
    ...(input.liquidity && { liquidity: input.liquidity }),
    decision,
  };
}

/**
 * Typical shipping the buyer pays on top of the item, from the fetched listings (median of paid shipping), in
 * `currency`. Listings with free shipping have it in the price already, so they do not count. Domestic listings
 * (item located in `country`) are preferred: cross-border shipping is not what a local Vinted buyer pays. Clamped 2..7.
 */
export function typicalBuyerShipping(items: readonly MarketplaceItem[], currency: CurrencyCode, fx: FxRateTable, country?: string): Money {
  const domestic = country ? items.filter((i) => i.country === country && i.shipping && i.shipping.amountMinor > 0) : [];
  const pool = domestic.length >= 5 ? domestic : items;
  const paid: number[] = [];
  for (const i of pool) {
    if (!i.shipping || i.shipping.amountMinor <= 0) continue;
    try {
      paid.push(convert(i.shipping, currency, fx).amount.amountMinor);
    } catch {
      // unknown currency: skip
    }
  }
  paid.sort((a, b) => a - b);
  const median = paid.length >= 5 ? paid[Math.floor(paid.length / 2)]! : 450;
  return { amountMinor: Math.round(Math.min(700, Math.max(200, median)) / 10) * 10, currency };
}
