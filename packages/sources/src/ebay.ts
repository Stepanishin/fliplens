import { createHash } from 'node:crypto';
import {
  ebayFashionCategories,
  fashionFromEbay,
  isCurrencyCode,
  isFashion,
  money,
  type CategorySlug,
  type Condition,
  type FashionAttributes,
  type MarketplaceItem,
  type NormalizedProduct,
} from '@fliplens/core';
import type { MarketplaceAdapter, SearchOptions, SearchResult, SourceWarning } from './adapter.js';

/**
 * eBay Browse API adapter (active listings only).
 * License constraints (docs/DATA_SOURCES.md): listing data must be <= 6h old, no archive of ended listings,
 * eBay content shown visually separate from other sources, no ML training on it.
 */

export interface EbayConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly env?: 'production' | 'sandbox';
  readonly defaultSites?: readonly string[];
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_SITES = ['EBAY_DE', 'EBAY_FR', 'EBAY_IT', 'EBAY_ES', 'EBAY_NL'] as const;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** eBay condition ids > our scale. 7000 (for parts) is filtered out in the query already. */
const CONDITION_BY_ID: Record<string, Condition> = {
  '1000': 'new',
  '1500': 'like_new',
  '1750': 'like_new',
  '2000': 'very_good',
  '2010': 'very_good',
  '2020': 'very_good',
  '2030': 'good',
  '2500': 'very_good',
  '2750': 'like_new',
  // Clothes, shoes and bags: "Pre-owned - Excellent / Good / Fair" (2990 / 3000 / 3010).
  '2990': 'very_good',
  '3000': 'good',
  '3010': 'fair',
  '4000': 'very_good',
  '5000': 'good',
  '6000': 'fair',
  '7000': 'for_parts',
};
const QUERY_CONDITION_IDS = Object.keys(CONDITION_BY_ID).filter((id) => id !== '7000');

/**
 * eBay leaf category per product category. IDs are shared across the EU sites
 * (checked 2026-09-28 on DE, FR, IT, ES, NL via Taxonomy API + Browse). Without this, a search for
 * "PlayStation 5" is mostly games and controllers. Unmapped categories search without a filter.
 */
const EBAY_CATEGORY: Partial<Record<CategorySlug, string>> = {
  headphones: '112529',
  smartphones: '9355',
  tablets: '171485',
  laptops: '177',
  smartwatches: '178893',
  streaming: '168058',
  consoles: '139971',
  handhelds: '139971',
  controllers: '117042',
  games: '139973',
  camera_bodies: '31388',
  compact_cameras: '31388',
  lenses: '3323',
  // Same IDs on DE, FR, IT, ES, NL and UK (checked 2026-10-19). Books: the top category, the leaf differs per site.
  lego: '19006',
  books: '267',
  vinyl: '176985',
  cds: '176984',
  movies: '617',
};

/** eBay leaf category > our category (for auto-detect). First slug wins where several share an eBay category. */
const CATEGORY_BY_EBAY: Record<string, CategorySlug> = {
  ...Object.fromEntries(Object.entries(EBAY_CATEGORY).reverse().map(([slug, id]) => [id, slug as CategorySlug])),
  '111422': 'laptops', // Apple Notebooks
  '139971': 'consoles',
  '31388': 'camera_bodies',
  '111694': 'speakers', // Audio-Docks & Mini-Lautsprecher
  '11724': 'action_cameras', // Camcorder (GoPro and similar land here)
  '101270': 'routers',
  '184655': 'power_tools',
  '261186': 'books', // Bücher (German leaf under 267)
};

export function ebayCategoryFor(p: NormalizedProduct): string | undefined {
  return ebayCategoriesFor(p)[0];
}

/** Usually one category; unisex fashion is searched in the women's and the men's category. Empty: no filter. */
export function ebayCategoriesFor(p: NormalizedProduct): string[] {
  if (isFashion(p.category)) return ebayFashionCategories(p);
  if (p.category === 'laptops' && p.brand.trim().toLowerCase() === 'apple') return ['111422']; // Apple Notebooks
  const id = EBAY_CATEGORY[p.category];
  return id ? [id] : [];
}

export interface CategorySuggestion {
  readonly category: CategorySlug;
  /** Clothes, shoes, bags: type and department read from the suggested eBay category. */
  readonly fashion?: FashionAttributes;
}

interface EbayMoney {
  value?: string;
  currency?: string;
}
interface EbayItemSummary {
  itemId?: string;
  title?: string;
  price?: EbayMoney;
  shippingOptions?: { shippingCost?: EbayMoney; shippingCostType?: string }[];
  condition?: string;
  conditionId?: string;
  itemLocation?: { country?: string };
  itemCreationDate?: string;
  itemWebUrl?: string;
  buyingOptions?: string[];
  seller?: { username?: string };
  image?: { imageUrl?: string };
  thumbnailImages?: { imageUrl?: string }[];
}
interface EbaySearchResponse {
  total?: number;
  itemSummaries?: EbayItemSummary[];
  warnings?: { message?: string }[];
  errors?: { message?: string; errorId?: number }[];
}

export class EbayAdapter implements MarketplaceAdapter {
  readonly id = 'ebay' as const;
  readonly capabilities = { sold: false, asking: true, gtinSearch: true } as const;

  private token?: { value: string; expiresAt: number };
  private readonly cache = new Map<string, { at: number; items: MarketplaceItem[] }>();
  /** Category suggestions are eBay taxonomy metadata, not listing content: safe to keep for the process lifetime. */
  private readonly categoryCache = new Map<string, CategorySuggestion>();
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;

  constructor(private readonly cfg: EbayConfig) {
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.base = cfg.env === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  }

  isConfigured(): boolean {
    return this.cfg.clientId.length > 0 && this.cfg.clientSecret.length > 0;
  }

  async searchProduct(product: NormalizedProduct, opts: SearchOptions = {}): Promise<SearchResult> {
    const sites = opts.sites ?? this.cfg.defaultSites ?? DEFAULT_SITES;
    const limit = Math.min(opts.limitPerSite ?? 100, 200);
    const warnings: SourceWarning[] = [];
    let calls = 0;
    let cacheHits = 0;

    if (!this.isConfigured()) {
      return { source: this.id, items: [], warnings: [{ source: this.id, message: 'eBay keys not configured' }], calls, cacheHits };
    }

    const results = await Promise.all(
      sites.map(async (site) => {
        const sort = opts.sort ?? 'best';
        const key = `${site}|${cacheKey(product)}|${limit}|${sort}`;
        const hit = this.cache.get(key);
        if (hit && Date.now() - hit.at < Math.min(CACHE_TTL_MS, opts.maxAgeMs ?? CACHE_TTL_MS)) {
          cacheHits++;
          return hit.items;
        }
        try {
          const cats = ebayCategoriesFor(product);
          const lists = await Promise.all(
            (cats.length > 0 ? cats : [undefined]).map((c) => {
              calls++;
              return this.searchSite(site, product, limit, true, c, sort);
            }),
          );
          // Unisex: the same listing can sit in both categories.
          const seen = new Set<string>();
          const items = lists.flat().filter((i) => !seen.has(i.externalId) && seen.add(i.externalId));
          this.cache.set(key, { at: Date.now(), items });
          return items;
        } catch (e) {
          warnings.push({ source: this.id, site, message: e instanceof Error ? e.message : String(e) });
          return [];
        }
      }),
    );
    this.evictExpired();

    const items = results.flat();
    const oldest = items.reduce<Date | undefined>((acc, i) => (!acc || i.fetchedAt < acc ? i.fetchedAt : acc), undefined);
    return { source: this.id, items, warnings, ...(oldest && { oldestFetchedAt: oldest }), calls, cacheHits };
  }

  /**
   * Barcode lookup: titles of listings that carry this GTIN, across sites and GTIN spellings (UPC-12 / EAN-13).
   * Used only to identify the product; valuation then searches by model name for a wider market.
   */
  /**
   * Auto-detect our category from a free-text product name via the eBay Taxonomy API (German tree, IDs are shared
   * across the EU sites). Falls back to 'other' when eBay suggests nothing we support.
   */
  async suggestCategory(query: string): Promise<CategorySlug> {
    return (await this.suggest(query)).category;
  }

  /** Category plus, for clothes, shoes and bags, type and department (women / men / kids). */
  async suggest(query: string): Promise<CategorySuggestion> {
    const key = `cat-suggest|${query.toLowerCase()}`;
    const hit = this.categoryCache.get(key);
    if (hit) return hit;
    const res = await this.fetchImpl(
      `${this.base}/commerce/taxonomy/v1/category_tree/77/get_category_suggestions?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${await this.accessToken()}`, Accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(`eBay taxonomy HTTP ${res.status}`);
    const body = (await res.json()) as {
      categorySuggestions?: { category: { categoryId: string }; categoryTreeNodeAncestors?: { categoryId: string }[] }[];
    };
    let found: CategorySuggestion | undefined;
    for (const sug of body.categorySuggestions ?? []) {
      const slug = CATEGORY_BY_EBAY[sug.category.categoryId];
      if (slug) {
        found = { category: slug };
        break;
      }
      const fashion = fashionFromEbay([sug.category.categoryId, ...(sug.categoryTreeNodeAncestors ?? []).map((a) => a.categoryId)]);
      if (fashion) {
        found = fashion;
        break;
      }
    }
    const result = found ?? { category: 'other' as const };
    this.categoryCache.set(key, result);
    return result;
  }

  async titlesForGtin(gtins: readonly string[], opts: { sites?: readonly string[] } = {}): Promise<{ titles: string[]; sites: Record<string, number>; warnings: SourceWarning[] }> {
    const sites = opts.sites ?? this.cfg.defaultSites ?? DEFAULT_SITES;
    const warnings: SourceWarning[] = [];
    const bySite: Record<string, number> = {};
    const titles: string[] = [];
    await Promise.all(
      sites.flatMap((site) =>
        gtins.map(async (gtin) => {
          const key = `gtin-titles|${site}|${gtin}`;
          const hit = this.cache.get(key);
          let items: MarketplaceItem[];
          if (hit && Date.now() - hit.at < CACHE_TTL_MS) items = hit.items;
          else {
            try {
              items = await this.searchSite(site, { category: 'other', brand: '', model: '', gtin }, 20, false);
              this.cache.set(key, { at: Date.now(), items });
            } catch (e) {
              warnings.push({ source: this.id, site, message: e instanceof Error ? e.message : String(e) });
              return;
            }
          }
          bySite[site] = (bySite[site] ?? 0) + items.length;
          titles.push(...items.map((i) => i.title));
        }),
      ),
    );
    return { titles: [...new Set(titles)], sites: bySite, warnings };
  }

  private async searchSite(site: string, product: NormalizedProduct, limit: number, filtered = true, categoryId?: string, sort: 'best' | 'newest' = 'best'): Promise<MarketplaceItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (sort === 'newest') params.set('sort', 'newlyListed');
    if (filtered) params.set('filter', `buyingOptions:{FIXED_PRICE|BEST_OFFER},conditionIds:{${QUERY_CONDITION_IDS.join('|')}}`);
    if (product.gtin) params.set('gtin', product.gtin);
    else params.set('q', searchQuery(product));
    if (filtered && categoryId) params.set('category_ids', categoryId);

    const res = await this.fetchImpl(`${this.base}/buy/browse/v1/item_summary/search?${params}`, {
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        'X-EBAY-C-MARKETPLACE-ID': site,
        Accept: 'application/json',
      },
    });
    const body = (await res.json()) as EbaySearchResponse;
    if (!res.ok) {
      const msg = body.errors?.map((e) => `${e.errorId ?? ''} ${e.message ?? ''}`.trim()).join('; ');
      throw new Error(`eBay ${site} HTTP ${res.status}: ${msg || res.statusText}`);
    }

    const fetchedAt = new Date();
    const out: MarketplaceItem[] = [];
    for (const s of body.itemSummaries ?? []) {
      const item = toItem(s, site, fetchedAt);
      if (item) out.push(item);
    }
    return out;
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const auth = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString('base64');
    const res = await this.fetchImpl(`${this.base}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
    });
    const body = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !body.access_token) {
      throw new Error(`eBay OAuth failed (HTTP ${res.status}): ${body.error_description ?? 'no token'}`);
    }
    this.token = { value: body.access_token, expiresAt: Date.now() + ((body.expires_in ?? 7200) - 60) * 1000 };
    return this.token.value;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.cache) if (now - v.at >= CACHE_TTL_MS) this.cache.delete(k);
  }
}

function searchQuery(p: NormalizedProduct): string {
  // Fashion: the category already says "women's shorts"; the free-text description ("drawstring cargo shorts")
  // would only shrink the results to listings that happen to use those English words. Brand plus a named style.
  if (isFashion(p.category)) return p.fashion ? [p.brand, p.fashion.style].filter(Boolean).join(' ') : [p.brand, p.model].join(' ');
  return [p.brand, p.model, p.capacity, p.mount].filter(Boolean).join(' ');
}

function cacheKey(p: NormalizedProduct): string {
  const base = p.gtin ? `gtin:${p.gtin}` : `q:${searchQuery(p).toLowerCase()}`;
  return `${base}|cat:${ebayCategoriesFor(p).join('+') || '-'}`;
}

function toItem(s: EbayItemSummary, site: string, fetchedAt: Date): MarketplaceItem | undefined {
  if (!s.itemId || !s.title || !s.price?.value || !s.price.currency || !isCurrencyCode(s.price.currency)) return undefined;
  const price = Number(s.price.value);
  if (!Number.isFinite(price)) return undefined;

  const ship = s.shippingOptions?.[0]?.shippingCost;
  const shipping =
    ship?.value !== undefined && ship.currency && isCurrencyCode(ship.currency) && Number.isFinite(Number(ship.value))
      ? money(Number(ship.value), ship.currency)
      : undefined;
  const condition = s.conditionId ? CONDITION_BY_ID[s.conditionId] : undefined;
  const bo = s.buyingOptions ?? [];

  return {
    source: 'ebay',
    marketplaceSite: site,
    externalId: s.itemId,
    url: s.itemWebUrl ?? '',
    ...((s.thumbnailImages?.[0]?.imageUrl ?? s.image?.imageUrl) && { imageUrl: (s.thumbnailImages?.[0]?.imageUrl ?? s.image?.imageUrl)! }),
    title: s.title,
    price: money(price, s.price.currency),
    ...(shipping && { shipping }),
    priceKind: 'asking',
    buyingFormat: bo.includes('AUCTION') ? 'auction' : bo.includes('BEST_OFFER') ? 'best_offer' : 'fixed_price',
    ...(s.condition && { conditionRaw: s.condition }),
    ...(condition && { condition }),
    ...(s.itemLocation?.country && { country: s.itemLocation.country }),
    ...(s.seller?.username && { sellerKey: createHash('sha256').update(s.seller.username).digest('hex').slice(0, 16) }),
    ...(s.itemCreationDate && { listedAt: new Date(s.itemCreationDate) }),
    fetchedAt,
  };
}
