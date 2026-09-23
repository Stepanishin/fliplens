import { compact, money, type Condition, type MarketplaceItem, type NormalizedProduct } from '@fliplens/core';
import type { MarketplaceAdapter, SearchResult } from './adapter.js';

/**
 * SYNTHETIC data for UI testing only. Prices are invented, never real market data.
 * Every item is marked source 'demo' and the UI must label it.
 */

interface Fixture {
  readonly match: string; // compact model key
  readonly title: string;
  readonly baseGoodEur: number;
  readonly noise: readonly string[];
}

const FIXTURES: readonly Fixture[] = [
  {
    match: 'wh1000xm4',
    title: 'Sony WH-1000XM4',
    baseGoodEur: 115,
    noise: ['Sony WH-1000XM5 schwarz', 'Ohrpolster für Sony WH-1000XM4', 'Sony WH-1000XM4 defekt', 'Hülle für Sony WH-1000XM4'],
  },
  {
    match: 'switcholed',
    title: 'Nintendo Switch OLED',
    baseGoodEur: 230,
    noise: ['Nintendo Switch Lite türkis', 'Nintendo Switch OLED + 3 Spiele', 'Nintendo Switch OLED nur OVP'],
  },
  {
    match: 'iphone13',
    title: 'Apple iPhone 13 128GB',
    baseGoodEur: 330,
    noise: ['Apple iPhone 13 Pro 128GB', 'Apple iPhone 13 256GB', 'Panzerglas für iPhone 13', 'iPhone 13 128GB Display defekt'],
  },
  {
    match: 'eosr6',
    title: 'Canon EOS R6 Body',
    baseGoodEur: 1350,
    noise: ['Canon EOS R6 Mark II Body', 'Akku für Canon EOS R6', 'Canon EOS R6 Gehäuse Bastler'],
  },
];

const SITES: readonly (readonly [string, string])[] = [
  ['DEMO_DE', 'DE'], ['DEMO_FR', 'FR'], ['DEMO_IT', 'IT'], ['DEMO_ES', 'ES'], ['DEMO_NL', 'NL'],
];
const CONDITION_MIX: readonly Condition[] = ['good', 'good', 'very_good', 'good', 'like_new', 'fair', 'good', 'very_good'];
const CONDITION_FACTOR: Record<Condition, number> = {
  new: 1.35, like_new: 1.2, very_good: 1.1, good: 1, fair: 0.82, poor: 0.6, for_parts: 0.3,
};

/** Deterministic PRNG so the same product always yields the same demo listings. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export class DemoAdapter implements MarketplaceAdapter {
  readonly id = 'demo' as const;
  readonly capabilities = { sold: false, asking: true, gtinSearch: false } as const;

  isConfigured(): boolean {
    return true;
  }

  async searchProduct(product: NormalizedProduct): Promise<SearchResult> {
    const key = compact(`${product.model} ${product.capacity ?? ''}`);
    const fx = FIXTURES.find((f) => key.includes(f.match) || compact(product.model).includes(f.match));
    const now = new Date();
    if (!fx) {
      return {
        source: 'demo',
        items: [],
        warnings: [{ source: 'demo', message: `No demo fixture for "${product.model}". Try WH-1000XM4, Switch OLED, iPhone 13 128GB, EOS R6.` }],
        calls: 0,
        cacheHits: 0,
      };
    }

    const r = rng([...fx.match].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const items: MarketplaceItem[] = [];
    for (let i = 0; i < 34; i++) {
      const [site, country] = SITES[i % SITES.length]!;
      const condition = CONDITION_MIX[i % CONDITION_MIX.length]!;
      const price = fx.baseGoodEur * CONDITION_FACTOR[condition] * (0.85 + r() * 0.35);
      items.push({
        source: 'demo',
        marketplaceSite: site,
        externalId: `${fx.match}-${i}`,
        url: '',
        title: `${fx.title} ${['', 'OVP', 'gebraucht', 'top Zustand', 'sehr gut'][i % 5]}`.trim(),
        price: money(Math.round(price), 'EUR'),
        shipping: money(i % 3 === 0 ? 0 : 5.99, 'EUR'),
        priceKind: 'asking',
        buyingFormat: i % 11 === 0 ? 'auction' : 'fixed_price',
        condition,
        country,
        listedAt: new Date(now.getTime() - Math.floor(r() * 60) * 86_400_000),
        fetchedAt: now,
      });
    }
    fx.noise.forEach((title, j) => {
      items.push({
        source: 'demo',
        marketplaceSite: 'DEMO_DE',
        externalId: `${fx.match}-noise-${j}`,
        url: '',
        title,
        price: money(Math.round(fx.baseGoodEur * (0.2 + r())), 'EUR'),
        priceKind: 'asking',
        buyingFormat: 'fixed_price',
        condition: 'good',
        country: 'DE',
        fetchedAt: now,
      });
    });
    // Two extreme prices to exercise outlier / scam filtering.
    items.push(
      { ...items[0]!, externalId: `${fx.match}-scam`, price: money(Math.round(fx.baseGoodEur * 0.2), 'EUR') },
      { ...items[1]!, externalId: `${fx.match}-high`, price: money(Math.round(fx.baseGoodEur * 3), 'EUR') },
    );

    return { source: 'demo', items, warnings: [], oldestFetchedAt: now, calls: 0, cacheHits: 0 };
  }
}
