import type { PricingConfig } from './config.js';
import type { ConfidenceLevel } from './types.js';

/** Piecewise-linear interpolation over [x, y] points sorted by x; clamps outside the range. */
export function interpolate(points: readonly (readonly [number, number])[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) throw new Error('empty curve');
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

export interface ConfidenceInputs {
  readonly identification: number; // 0..1
  readonly includedCount: number;
  readonly meanSimilarity: number; // 0..1
  readonly medianAgeDays: number;
  readonly dataKind: 'sold' | 'asking';
  /** (p75 - p25) / median */
  readonly relativeSpread: number;
}

export interface ConfidenceFactor {
  readonly name: 'identification' | 'comparable_count' | 'similarity' | 'freshness' | 'data_kind' | 'spread';
  readonly value: number; // multiplier 0..1
  readonly input: number | string;
}

export interface Confidence {
  readonly score: number;
  readonly level: ConfidenceLevel;
  readonly factors: readonly ConfidenceFactor[];
}

export function levelFor(score: number, cfg: PricingConfig): ConfidenceLevel {
  if (score >= cfg.confidence.highAt) return 'high';
  if (score >= cfg.confidence.mediumAt) return 'medium';
  return 'low';
}

export function computeConfidence(i: ConfidenceInputs, cfg: PricingConfig): Confidence {
  const c = cfg.confidence;
  const factors: ConfidenceFactor[] = [
    { name: 'identification', value: clamp01(i.identification), input: i.identification },
    { name: 'comparable_count', value: interpolate(c.countCurve, i.includedCount), input: i.includedCount },
    { name: 'similarity', value: clamp01(i.meanSimilarity), input: round2(i.meanSimilarity) },
    { name: 'freshness', value: interpolate(c.freshnessCurveDays, i.medianAgeDays), input: Math.round(i.medianAgeDays) },
    { name: 'data_kind', value: i.dataKind === 'sold' ? 1 : c.askingFactor, input: i.dataKind },
    { name: 'spread', value: interpolate(c.spreadCurve, i.relativeSpread), input: round2(i.relativeSpread) },
  ];
  const score = factors.reduce((acc, f) => acc * f.value, 1);
  return { score: round2(score), level: levelFor(score, cfg), factors };
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const round2 = (x: number): number => Math.round(x * 100) / 100;
