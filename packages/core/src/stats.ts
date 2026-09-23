import type { Distribution } from './types.js';

/** Linear-interpolated percentile (same as numpy "linear" / Excel PERCENTILE.INC). `sorted` must be ascending. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error('percentile of empty array');
  if (p <= 0) return sorted[0]!;
  if (p >= 1) return sorted[sorted.length - 1]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loV = sorted[lo]!;
  const hiV = sorted[hi]!;
  return loV + (hiV - loV) * (idx - lo);
}

export function distribution(values: readonly number[]): Distribution {
  if (values.length === 0) throw new Error('distribution of empty array');
  const s = [...values].sort((a, b) => a - b);
  return {
    count: s.length,
    min: s[0]!,
    p10: percentile(s, 0.1),
    p25: percentile(s, 0.25),
    median: percentile(s, 0.5),
    p75: percentile(s, 0.75),
    p90: percentile(s, 0.9),
    max: s[s.length - 1]!,
  };
}
