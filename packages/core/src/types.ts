import type { CurrencyCode, Money } from './money.js';

export const CONDITIONS = ['new', 'like_new', 'very_good', 'good', 'fair', 'poor', 'for_parts'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CATEGORIES = [
  'headphones', 'smartphones', 'tablets', 'laptops', 'smartwatches', 'speakers', 'routers', 'streaming',
  'consoles', 'handhelds', 'controllers', 'games',
  'camera_bodies', 'lenses', 'action_cameras', 'compact_cameras',
  'power_tools', 'other',
] as const;
export type CategorySlug = (typeof CATEGORIES)[number];

export interface NormalizedProduct {
  readonly category: CategorySlug;
  readonly brand: string;
  readonly family?: string;
  /** Model as commonly written, e.g. "WH-1000XM4", "iPhone 15 Pro", "RF 24-105mm F4L IS USM". */
  readonly model: string;
  readonly generation?: string;
  readonly variant?: string;
  /** e.g. "128GB", "1TB". */
  readonly capacity?: string;
  readonly colour?: string;
  readonly gtin?: string;
  /** Lens / body mount, e.g. "RF", "EF", "EF-S", "FE". */
  readonly mount?: string;
  /** Other model names that must NOT match (e.g. siblings), e.g. ["WH-1000XM5"]. */
  readonly excludeModels?: readonly string[];
}

export type SourceId = 'ebay' | 'tradera' | 'rebuy' | 'backmarket' | 'manual' | 'user_sale';
export type PriceKind = 'asking' | 'sold' | 'buyback' | 'refurbished_retail';
export type BuyingFormat = 'fixed_price' | 'auction' | 'best_offer' | 'unknown';
export type CountryCode = string; // ISO 3166-1 alpha-2

export interface MarketplaceItem {
  readonly source: SourceId;
  readonly marketplaceSite: string;
  readonly externalId: string;
  readonly url: string;
  /** Listing photo (shown next to the comparable; never stored). */
  readonly imageUrl?: string;
  readonly title: string;
  readonly price: Money;
  readonly shipping?: Money;
  readonly priceKind: PriceKind;
  readonly buyingFormat: BuyingFormat;
  readonly conditionRaw?: string;
  readonly condition?: Condition;
  readonly country?: CountryCode;
  /** Opaque per-source seller key (hash), used only for duplicate detection. Never a raw username. */
  readonly sellerKey?: string;
  readonly listedAt?: Date;
  readonly soldAt?: Date;
  readonly fetchedAt: Date;
}

export const EXCLUSION_REASONS = [
  'wrong_variant',
  'model_not_found',
  'accessory_only',
  'box_only',
  'for_parts',
  'bundle',
  'auction_unknown_final',
  'duplicate',
  'outlier_low',
  'outlier_high',
  'suspected_scam',
  'stale',
  'condition_mismatch',
  'seller_cap',
  'currency_unknown',
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

/** A marketplace item after matching, currency and condition normalization. */
export interface ScoredComparable {
  readonly item: MarketplaceItem;
  readonly similarity: number; // 0..1
  readonly included: boolean;
  readonly exclusionReason?: ExclusionReason;
  /** Price in target currency, before condition adjustment. Undefined if conversion failed. */
  readonly priceTarget?: Money;
  /** Price in target currency after condition adjustment. */
  readonly adjustedPrice?: Money;
  readonly fxRate?: number;
  readonly fxRateDate?: string;
}

export interface Distribution {
  readonly count: number;
  readonly min: number;
  readonly p10: number;
  readonly p25: number;
  readonly median: number;
  readonly p75: number;
  readonly p90: number;
  readonly max: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type Decision = 'strong_buy' | 'buy' | 'borderline' | 'skip';

export type { CurrencyCode, Money };
