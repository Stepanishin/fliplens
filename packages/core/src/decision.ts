import type { PricingConfig } from './config.js';
import type { Confidence } from './confidence.js';
import { formatMoney, toMajor, type Money } from './money.js';
import type { Decision } from './types.js';

export type Liquidity = 'high' | 'medium' | 'low';

export interface DecisionInput {
  readonly profit: Money;
  readonly roiPct: number | null;
  readonly confidence: Confidence;
  readonly includedCount: number;
  readonly dataKind: 'sold' | 'asking';
  /** undefined = liquidity data unavailable (never invented). */
  readonly liquidity?: Liquidity;
}

export interface DecisionResult {
  readonly decision: Decision;
  readonly factors: readonly string[];
  readonly risks: readonly string[];
}

/** Transparent rule-based decision. Every result lists the facts it was based on. */
export function decide(i: DecisionInput, cfg: PricingConfig): DecisionResult {
  const t = cfg.decision;
  const profitMajor = toMajor(i.profit);
  const roi = i.roiPct ?? Number.POSITIVE_INFINITY;
  const meets = (r: { minRoiPct: number; minProfitMajor: number }): boolean =>
    roi >= r.minRoiPct && profitMajor >= r.minProfitMajor;

  let decision: Decision;
  if (meets(t.strongBuy) && i.confidence.level !== 'low' && i.liquidity !== 'low') decision = 'strong_buy';
  else if (meets(t.buy) && i.confidence.level !== 'low') decision = 'buy';
  else if (roi >= t.borderline.minRoiPct || profitMajor >= t.borderline.minProfitMajor) decision = 'borderline';
  else decision = 'skip';

  // Low confidence never produces better than borderline.
  if (i.confidence.level === 'low' && decision !== 'skip') decision = 'borderline';

  const factors = [
    i.roiPct === null ? 'ROI n/a (free item)' : `ROI ${i.roiPct}%`,
    `expected profit ${formatMoney(i.profit)}`,
    i.liquidity === undefined ? 'selling speed unknown (only supply data)' : `${i.liquidity} demand`,
    `${i.includedCount} comparable ${i.dataKind === 'sold' ? 'sales' : 'active listings'}`,
  ];

  const risks: string[] = [];
  const idf = i.confidence.factors.find((f) => f.name === 'identification');
  if (idf && idf.value < 0.9) risks.push(`model identification confidence ${Math.round(idf.value * 100)}%`);
  if (i.dataKind === 'asking') risks.push('based on asking prices, not sold prices');
  const spread = i.confidence.factors.find((f) => f.name === 'spread');
  if (spread && spread.value < 0.8) risks.push('wide price spread between comparables');
  const count = i.confidence.factors.find((f) => f.name === 'comparable_count');
  if (count && count.value < 0.8) risks.push('few comparables');
  if (i.confidence.level === 'low') risks.push('low overall confidence');

  return { decision, factors, risks };
}
