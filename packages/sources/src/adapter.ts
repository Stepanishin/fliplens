import type { MarketplaceItem, NormalizedProduct, SourceId } from '@fliplens/core';

export interface SearchOptions {
  /** Marketplace sites to query, e.g. ['EBAY_DE', 'EBAY_FR']. Adapter default if omitted. */
  readonly sites?: readonly string[];
  readonly limitPerSite?: number;
  readonly requestId?: string;
}

export interface SourceWarning {
  readonly source: SourceId;
  readonly site?: string;
  readonly message: string;
}

export interface SearchResult {
  readonly source: SourceId;
  readonly items: readonly MarketplaceItem[];
  readonly warnings: readonly SourceWarning[];
  /** Oldest fetch time among the returned items (data age shown to the user). */
  readonly oldestFetchedAt?: Date;
  readonly calls: number;
  readonly cacheHits: number;
}

/** Marketplace-specific code lives only behind this interface; the pricing engine never sees it. */
export interface MarketplaceAdapter {
  readonly id: SourceId;
  readonly capabilities: { readonly sold: boolean; readonly asking: boolean; readonly gtinSearch: boolean };
  isConfigured(): boolean;
  searchProduct(query: NormalizedProduct, opts?: SearchOptions): Promise<SearchResult>;
}
