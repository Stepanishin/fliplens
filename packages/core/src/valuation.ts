import { DEFAULT_PRICING_CONFIG, type PricingConfig } from './config.js';
import { decide, type DecisionResult, type Liquidity } from './decision.js';
import type { Money } from './money.js';
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
  const estimate = estimatePrice({ ...input, config: cfg });
  if (estimate.status !== 'ok') return estimate;

  const scenario = (salePrice: Money): ProfitBreakdown =>
    computeProfit({
      salePrice,
      purchasePrice: input.purchasePrice,
      fees: input.fees,
      shippingCost: input.shippingCost,
      ...(input.packagingCost && { packagingCost: input.packagingCost }),
    });
  const profit = { fast: scenario(estimate.fast), expected: scenario(estimate.expected), high: scenario(estimate.high) };

  const decision = decide(
    {
      profit: profit.expected.profit,
      roiPct: profit.expected.roiPct,
      confidence: estimate.confidence,
      includedCount: estimate.distribution.count,
      dataKind: estimate.dataKind,
      ...(input.liquidity && { liquidity: input.liquidity }),
    },
    cfg,
  );

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
