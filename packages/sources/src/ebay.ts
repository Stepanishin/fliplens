import { createHash } from 'node:crypto';
import { isCurrencyCode, money, type Condition, type MarketplaceItem, type NormalizedProduct } from '@fliplens/core';
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
  '3000': 'good',
  '4000': 'very_good',
  '5000': 'good',
  '6000': 'fair',
  '7000': 'for_parts',
};
const QUERY_CONDITION_IDS = Object.keys(CONDITION_BY_ID).filter((id) => id !== '7000');

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
        const key = `${site}|${cacheKey(product)}|${limit}`;
        const hit = this.cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
          cacheHits++;
          return hit.items;
        }
        try {
          calls++;
          const items = await this.searchSite(site, product, limit);
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

  private async searchSite(site: string, product: NormalizedProduct, limit: number): Promise<MarketplaceItem[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      filter: `buyingOptions:{FIXED_PRICE|BEST_OFFER},conditionIds:{${QUERY_CONDITION_IDS.join('|')}}`,
    });
    if (product.gtin) params.set('gtin', product.gtin);
    else params.set('q', searchQuery(product));

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
  return [p.brand, p.model, p.capacity, p.mount].filter(Boolean).join(' ');
}

function cacheKey(p: NormalizedProduct): string {
  return p.gtin ? `gtin:${p.gtin}` : `q:${searchQuery(p).toLowerCase()}`;
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
