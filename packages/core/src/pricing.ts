import { DEFAULT_PRICING_CONFIG, type PricingConfig } from './config.js';
import { computeConfidence, type Confidence } from './confidence.js';
import { compact, matchTitle } from './matching.js';
import { convert, MissingFxRateError, type CurrencyCode, type FxRateTable, type Money } from './money.js';
import { distribution, percentile } from './stats.js';
import {
  CONDITIONS,
  type Condition,
  type Distribution,
  type ExclusionReason,
  type MarketplaceItem,
  type NormalizedProduct,
} from './types.js';

export interface PriceEstimateInput {
  readonly product: NormalizedProduct;
  readonly targetCondition: Condition;
  readonly items: readonly MarketplaceItem[];
  readonly targetCurrency: CurrencyCode;
  readonly fx: FxRateTable;
  readonly now: Date;
  /** 0..1 from recognition (1 for barcode exact match / manual entry). */
  readonly identificationConfidence: number;
  readonly config?: PricingConfig;
}

export type ComparableRole = 'comparable' | 'anchor' | 'unused_kind';

export interface EvaluatedComparable {
  readonly item: MarketplaceItem;
  readonly similarity: number;
  readonly included: boolean;
  readonly role: ComparableRole;
  readonly exclusionReason?: ExclusionReason;
  readonly exclusionDetail?: string;
  /** Total buyer price (item + shipping) in target currency. */
  readonly priceTarget?: Money;
  /** priceTarget adjusted to the target condition. */
  readonly adjustedPrice?: Money;
  readonly fxRate?: number;
  readonly fxRateDate?: string;
  readonly assumedCondition?: Condition;
}

export interface Anchors {
  /** Highest buy-back offer seen: a floor for a fast sale. */
  readonly buybackFloor?: Money;
  /** Lowest refurbished retail price seen: a ceiling for a used sale. */
  readonly refurbishedCeiling?: Money;
}

export interface PriceEstimate {
  readonly status: 'ok';
  readonly algorithmVersion: string;
  readonly dataKind: 'sold' | 'asking';
  readonly currency: CurrencyCode;
  /** Distribution of condition-adjusted prices, in minor units of `currency`. */
  readonly distribution: Distribution;
  readonly fast: Money;
  readonly expected: Money;
  readonly high: Money;
  readonly anchors: Anchors;
  readonly confidence: Confidence;
  readonly comparables: readonly EvaluatedComparable[];
  readonly warnings: readonly string[];
}

export interface InsufficientData {
  readonly status: 'insufficient_data';
  readonly algorithmVersion: string;
  readonly reason: 'low_identification_confidence' | 'too_few_comparables';
  readonly includedCount: number;
  readonly suggestions: readonly ('retake_photo' | 'enter_model' | 'scan_barcode')[];
  readonly comparables: readonly EvaluatedComparable[];
  readonly warnings: readonly string[];
}

const DAY_MS = 86_400_000;

type Work = {
  item: MarketplaceItem;
  similarity: number;
  role: ComparableRole;
  reason?: ExclusionReason;
  detail?: string;
  priceTarget?: Money;
  adjustedPrice?: Money;
  fxRate?: number;
  fxRateDate?: string;
  assumedCondition?: Condition;
};

const conditionIndex = (c: Condition): number => CONDITIONS.indexOf(c);

function exclude(w: Work, reason: ExclusionReason, detail?: string): void {
  if (w.reason !== undefined) return;
  w.reason = reason;
  if (detail !== undefined) w.detail = detail;
}

function ageDays(item: MarketplaceItem, now: Date): number {
  const at = item.soldAt ?? item.listedAt ?? item.fetchedAt;
  return Math.max(0, (now.getTime() - at.getTime()) / DAY_MS);
}

function money(amountMinor: number, currency: CurrencyCode): Money {
  return { amountMinor: Math.round(amountMinor), currency };
}

/** Round to whole major units: estimates must not pretend to cent precision. */
function roundMajor(amountMinor: number, currency: CurrencyCode): Money {
  return money(Math.round(amountMinor / 100) * 100, currency);
}

export function estimatePrice(input: PriceEstimateInput): PriceEstimate | InsufficientData {
  const cfg = input.config ?? DEFAULT_PRICING_CONFIG;
  const { product, targetCondition, targetCurrency, fx, now } = input;
  const warnings: string[] = [];

  const work: Work[] = input.items.map((item) => ({ item, similarity: 0, role: 'comparable' }));

  // 1. Anchors are not comparables.
  for (const w of work) {
    if (w.item.priceKind === 'buyback' || w.item.priceKind === 'refurbished_retail') w.role = 'anchor';
  }

  // 2. Title matching + structural filters.
  for (const w of work) {
    const m = matchTitle(product, w.item.title);
    w.similarity = m.similarity;
    if (m.reason !== undefined) exclude(w, m.reason, m.detail);
    if (w.item.condition === 'for_parts' && targetCondition !== 'for_parts') exclude(w, 'for_parts', 'condition');
    if (w.role === 'comparable' && w.item.priceKind === 'asking' && w.item.buyingFormat === 'auction') {
      exclude(w, 'auction_unknown_final');
    }
    const maxAge = w.item.priceKind === 'sold' ? cfg.maxSoldAgeDays : cfg.maxAskingAgeDays;
    if ((w.item.soldAt ?? w.item.listedAt) !== undefined && ageDays(w.item, now) > maxAge) exclude(w, 'stale');
  }

  // 3. Duplicates: same external id, or same seller + title + price (cross-listed on several sites).
  // Without a seller key identical titles and prices are common and legitimate, so they are kept.
  const seen = new Set<string>();
  for (const w of work) {
    if (w.reason !== undefined) continue;
    const idKey = `${w.item.source}:${w.item.externalId}`;
    const contentKey =
      w.item.sellerKey === undefined
        ? undefined
        : `${w.item.sellerKey}|${compact(w.item.title)}|${w.item.price.amountMinor}${w.item.price.currency}`;
    if (seen.has(idKey) || (contentKey !== undefined && seen.has(contentKey))) {
      exclude(w, 'duplicate');
      continue;
    }
    seen.add(idKey);
    if (contentKey !== undefined) seen.add(contentKey);
  }

  // 4. Currency: total buyer price (item + shipping) in target currency.
  for (const w of work) {
    if (w.reason !== undefined) continue;
    try {
      const p = convert(w.item.price, targetCurrency, fx);
      const s = w.item.shipping ? convert(w.item.shipping, targetCurrency, fx).amount.amountMinor : 0;
      w.priceTarget = money(p.amount.amountMinor + s, targetCurrency);
      w.fxRate = p.rate;
      w.fxRateDate = p.rateDate;
    } catch (e) {
      if (!(e instanceof MissingFxRateError)) throw e;
      exclude(w, 'currency_unknown', e.currency);
    }
  }

  const anchors = collectAnchors(work.filter((w) => w.role === 'anchor' && w.reason === undefined));

  // 5. Pick data kind: sold if there is enough of it, otherwise asking.
  const live = work.filter((w) => w.role === 'comparable' && w.reason === undefined);
  const soldCount = live.filter((w) => w.item.priceKind === 'sold').length;
  const dataKind: 'sold' | 'asking' = soldCount >= cfg.minComparables ? 'sold' : 'asking';
  for (const w of live) if (w.item.priceKind !== dataKind) w.role = 'unused_kind';
  const pool = live.filter((w) => w.role === 'comparable');

  // 6. Condition: same bucket if there is enough, otherwise adjust neighbours by multipliers.
  for (const w of pool) {
    if (w.item.condition === undefined) {
      w.assumedCondition = cfg.defaultCondition;
      w.similarity *= 0.9;
    }
  }
  const condOf = (w: Work): Condition => w.item.condition ?? cfg.defaultCondition;
  const sameCount = pool.filter((w) => w.item.condition === targetCondition).length;
  const useSameOnly = sameCount >= cfg.minSameCondition;
  const targetMult = cfg.conditionMultipliers[targetCondition];
  for (const w of pool) {
    const c = condOf(w);
    const distance = Math.abs(conditionIndex(c) - conditionIndex(targetCondition));
    if (useSameOnly && w.item.condition !== targetCondition) {
      exclude(w, 'condition_mismatch', c);
      continue;
    }
    if (distance > cfg.maxConditionDistance) {
      exclude(w, 'condition_mismatch', c);
      continue;
    }
    const factor = targetMult / cfg.conditionMultipliers[c];
    w.adjustedPrice = money(w.priceTarget!.amountMinor * factor, targetCurrency);
    w.similarity *= 1 - 0.05 * distance;
  }

  // 7. Outliers on log prices: scam threshold first, then Tukey fences.
  const candidates = pool.filter((w) => w.reason === undefined);
  if (candidates.length >= 4) {
    const logs = candidates.map((w) => Math.log(w.adjustedPrice!.amountMinor)).sort((a, b) => a - b);
    const med = Math.exp(percentile(logs, 0.5));
    const q1 = percentile(logs, 0.25);
    const q3 = percentile(logs, 0.75);
    const iqr = q3 - q1;
    const lo = q1 - cfg.outlierIqrK * iqr;
    const hi = q3 + cfg.outlierIqrK * iqr;
    for (const w of candidates) {
      const v = w.adjustedPrice!.amountMinor;
      if (v < med * cfg.scamRatio) exclude(w, 'suspected_scam');
      else if (Math.log(v) < lo) exclude(w, 'outlier_low');
      else if (Math.log(v) > hi) exclude(w, 'outlier_high');
    }
  }

  const included = pool.filter((w) => w.reason === undefined);
  const comparables = work.map(toEvaluated);

  if (input.identificationConfidence < cfg.confidence.minIdentification) {
    return insufficient('low_identification_confidence', included.length, comparables, warnings, cfg);
  }
  if (included.length < cfg.minComparables) {
    return insufficient('too_few_comparables', included.length, comparables, warnings, cfg);
  }

  const dist = distribution(included.map((w) => w.adjustedPrice!.amountMinor));
  let fast: number;
  let expected: number;
  let high: number;
  if (dataKind === 'sold') {
    fast = dist.p25;
    expected = dist.median;
    high = dist.p75;
  } else {
    const ratio = cfg.askingToSoldRatio[product.category] ?? cfg.askingToSoldRatio.default;
    fast = dist.p25 * ratio;
    expected = dist.median * ratio;
    high = dist.p75;
    warnings.push(`Based on ${included.length} active listings (asking prices), not sold prices.`);
  }

  if (anchors.buybackFloor && anchors.buybackFloor.amountMinor > fast) {
    fast = anchors.buybackFloor.amountMinor;
    warnings.push('Fast sale price raised to the best buy-back offer.');
  }
  if (anchors.refurbishedCeiling) {
    const cap = anchors.refurbishedCeiling.amountMinor;
    if (high > cap) high = cap;
    if (expected > cap) {
      expected = cap;
      warnings.push('Expected price capped at refurbished retail price.');
    }
  }
  expected = Math.max(fast, Math.min(expected, high));

  const meanSimilarity = included.reduce((a, w) => a + w.similarity, 0) / included.length;
  const ages = included.map((w) => ageDays(w.item, now)).sort((a, b) => a - b);
  const confidence = computeConfidence(
    {
      identification: input.identificationConfidence,
      includedCount: included.length,
      meanSimilarity,
      medianAgeDays: percentile(ages, 0.5),
      dataKind,
      relativeSpread: dist.median > 0 ? (dist.p75 - dist.p25) / dist.median : 1,
    },
    cfg,
  );

  return {
    status: 'ok',
    algorithmVersion: cfg.version,
    dataKind,
    currency: targetCurrency,
    distribution: dist,
    fast: roundMajor(fast, targetCurrency),
    expected: roundMajor(expected, targetCurrency),
    high: roundMajor(high, targetCurrency),
    anchors,
    confidence,
    comparables,
    warnings,
  };
}

function collectAnchors(anchors: readonly Work[]): Anchors {
  let floor: Money | undefined;
  let ceiling: Money | undefined;
  for (const w of anchors) {
    const p = w.priceTarget!;
    if (w.item.priceKind === 'buyback' && (!floor || p.amountMinor > floor.amountMinor)) floor = p;
    if (w.item.priceKind === 'refurbished_retail' && (!ceiling || p.amountMinor < ceiling.amountMinor)) ceiling = p;
  }
  return { ...(floor && { buybackFloor: floor }), ...(ceiling && { refurbishedCeiling: ceiling }) };
}

function toEvaluated(w: Work): EvaluatedComparable {
  return {
    item: w.item,
    similarity: Math.round(w.similarity * 100) / 100,
    included: w.role === 'comparable' && w.reason === undefined,
    role: w.role,
    ...(w.reason !== undefined && { exclusionReason: w.reason }),
    ...(w.detail !== undefined && { exclusionDetail: w.detail }),
    ...(w.priceTarget && { priceTarget: w.priceTarget }),
    ...(w.adjustedPrice && { adjustedPrice: w.adjustedPrice }),
    ...(w.fxRate !== undefined && { fxRate: w.fxRate }),
    ...(w.fxRateDate !== undefined && { fxRateDate: w.fxRateDate }),
    ...(w.assumedCondition !== undefined && { assumedCondition: w.assumedCondition }),
  };
}

function insufficient(
  reason: InsufficientData['reason'],
  includedCount: number,
  comparables: readonly EvaluatedComparable[],
  warnings: readonly string[],
  cfg: PricingConfig,
): InsufficientData {
  return {
    status: 'insufficient_data',
    algorithmVersion: cfg.version,
    reason,
    includedCount,
    suggestions:
      reason === 'low_identification_confidence'
        ? ['retake_photo', 'scan_barcode', 'enter_model']
        : ['enter_model', 'scan_barcode', 'retake_photo'],
    comparables,
    warnings,
  };
}
