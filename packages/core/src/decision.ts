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
  /** Expected sale price: caps the profit minimums for cheap items. */
  readonly salePrice?: Money;
  /** Profit and ROI at the fast-sale price: the downside if the estimate is too high. */
  readonly fastProfit?: Money;
  readonly fastRoiPct?: number | null;
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
  const sale = i.salePrice ? toMajor(i.salePrice) : Number.POSITIVE_INFINITY;
  const minProfit = (r: { minProfitMajor: number }, share: number): number => Math.min(r.minProfitMajor, share * sale);
  const share = t.cheapItemProfitShare;
  const meets = (r: { minRoiPct: number; minProfitMajor: number }, s: number): boolean =>
    roi >= r.minRoiPct && profitMajor >= minProfit(r, s);

  let decision: Decision;
  // Even the quick-sale price clears the "buy" bar: the downside is covered, whatever the confidence.
  const fastRoi = i.fastRoiPct === undefined ? undefined : (i.fastRoiPct ?? Number.POSITIVE_INFINITY);
  const safeAtFastSale =
    i.fastProfit !== undefined && fastRoi !== undefined && fastRoi >= t.buy.minRoiPct && toMajor(i.fastProfit) >= minProfit(t.buy, share.buy);

  if (meets(t.strongBuy, share.strongBuy) && i.confidence.level !== 'low' && i.liquidity !== 'low') decision = 'strong_buy';
  else if (meets(t.buy, share.buy) && (i.confidence.level !== 'low' || safeAtFastSale)) decision = 'buy';
  else if (roi >= t.borderline.minRoiPct || profitMajor >= minProfit(t.borderline, share.borderline)) decision = 'borderline';
  else decision = 'skip';

  // Low confidence never produces better than borderline, unless even a quick sale is clearly profitable.
  if (i.confidence.level === 'low' && decision !== 'skip' && !(decision === 'buy' && safeAtFastSale)) decision = 'borderline';

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
  if (i.confidence.level === 'low' && decision === 'buy') factors.push('profitable even at the quick-sale price');

  return { decision, factors, risks };
}
