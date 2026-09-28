import { toMajor, type Money } from '@fliplens/core';

export function fmt(m: Money, digits = 0): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajor(m));
}

export function ago(iso: string | null): string {
  if (!iso) return 'unknown';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export const CONDITION_LABEL = {
  new: 'New',
  like_new: 'Like new',
  very_good: 'Very good',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  for_parts: 'For parts',
} as const;

export const DECISION_LABEL = {
  strong_buy: 'STRONG BUY',
  buy: 'BUY',
  borderline: 'BORDERLINE',
  skip: 'SKIP',
} as const;

export const REASON_LABEL: Record<string, string> = {
  wrong_variant: 'Wrong variant',
  model_not_found: 'Model not in title',
  accessory_only: 'Accessory',
  box_only: 'Box only',
  for_parts: 'For parts / broken',
  bundle: 'Bundle',
  auction_unknown_final: 'Auction (no final price)',
  duplicate: 'Duplicate',
  outlier_low: 'Outlier (low)',
  outlier_high: 'Outlier (high)',
  suspected_scam: 'Suspected scam',
  stale: 'Too old',
  condition_mismatch: 'Condition too different',
  seller_cap: 'Same seller (max 3)',
  currency_unknown: 'Unknown currency',
};

export const FACTOR_LABEL: Record<string, string> = {
  identification: 'Identification',
  comparable_count: 'Comparable count',
  similarity: 'Match quality',
  freshness: 'Data freshness',
  data_kind: 'Sold vs asking',
  spread: 'Price spread',
};
