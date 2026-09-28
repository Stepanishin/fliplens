import type { CategorySlug, Condition } from './types.js';

/**
 * All tunable numbers of the pricing / confidence / decision engine live here, under one version.
 * Any change to these values must bump PRICING_ALGORITHM_VERSION and pass the benchmark (eval/).
 */
export const PRICING_ALGORITHM_VERSION = 'pricing-0.1.5';

export interface PricingConfig {
  readonly version: string;
  /** Minimum included comparables to produce a valuation at all. */
  readonly minComparables: number;
  /** Use only same-condition comparables if there are at least this many of them... */
  readonly minSameCondition: number;
  /** ...and they make up at least this share of the pool (otherwise adjust neighbours by multipliers). */
  readonly minSameConditionShare: number;
  /** Max comparables per seller, so one dealer with 30 units cannot set the price. */
  readonly maxPerSeller: number;
  /** Comparables more than this many condition steps away are excluded. */
  readonly maxConditionDistance: number;
  /** Relative value of each condition (new = 1). Used to adjust prices across conditions. Starting guesses, calibrate on benchmark. */
  readonly conditionMultipliers: Readonly<Record<Condition, number>>;
  /** Condition assumed when a listing has none. */
  readonly defaultCondition: Condition;
  /** asking price x ratio ~= sold price. Starting hypothesis 0.85-0.90, calibrate per category. */
  readonly askingToSoldRatio: Readonly<Partial<Record<CategorySlug, number>>> & { readonly default: number };
  /** Below ratio x median = suspected scam. */
  readonly scamRatio: number;
  /** Tukey fence multiplier on log-price IQR. */
  readonly outlierIqrK: number;
  readonly maxSoldAgeDays: number;
  readonly maxAskingAgeDays: number;
  readonly confidence: {
    readonly highAt: number;
    readonly mediumAt: number;
    readonly countCurve: readonly (readonly [number, number])[];
    readonly freshnessCurveDays: readonly (readonly [number, number])[];
    readonly spreadCurve: readonly (readonly [number, number])[];
    readonly askingFactor: number;
    /** Below this identification confidence we refuse to value. */
    readonly minIdentification: number;
  };
  readonly decision: {
    readonly strongBuy: { readonly minRoiPct: number; readonly minProfitMajor: number };
    readonly buy: { readonly minRoiPct: number; readonly minProfitMajor: number };
    readonly borderline: { readonly minRoiPct: number; readonly minProfitMajor: number };
  };
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: PRICING_ALGORITHM_VERSION,
  minComparables: 5,
  minSameCondition: 5,
  minSameConditionShare: 0.4,
  maxPerSeller: 3,
  maxConditionDistance: 2,
  conditionMultipliers: {
    new: 1.0,
    like_new: 0.9,
    very_good: 0.82,
    good: 0.75,
    fair: 0.62,
    poor: 0.45,
    for_parts: 0.25,
  },
  defaultCondition: 'good',
  askingToSoldRatio: { default: 0.88 },
  scamRatio: 0.35,
  outlierIqrK: 1.5,
  maxSoldAgeDays: 90,
  maxAskingAgeDays: 180,
  confidence: {
    highAt: 0.75,
    mediumAt: 0.5,
    countCurve: [[5, 0.6], [15, 0.85], [30, 1.0]],
    freshnessCurveDays: [[30, 1.0], [90, 0.8], [180, 0.6]],
    spreadCurve: [[0.2, 1.0], [0.5, 0.8], [1.0, 0.5]],
    askingFactor: 0.8,
    minIdentification: 0.5,
  },
  decision: {
    strongBuy: { minRoiPct: 60, minProfitMajor: 20 },
    buy: { minRoiPct: 30, minProfitMajor: 10 },
    borderline: { minRoiPct: 10, minProfitMajor: 5 },
  },
};
