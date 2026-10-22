import type { ListingData, MarketplaceId } from './shared.js';

/**
 * Reading listing pages, one adapter per marketplace. Most sites publish schema.org Product data (name, price,
 * currency, photo); description and details come from the page itself, where each site has its own markup.
 * The manifest's content_scripts matches (scripts/build.mjs) must cover the same sites.
 */

/** "1.200 € VB", "€12.50", "12,00 €", "£1,200.00" > number in major units. */
export function parsePrice(text: string): number | undefined {
  const s = text.replace(/[^\d.,]/g, '').replace(/[.,]+$/, '');
  if (!/\d/.test(s)) return undefined;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  const tail = last < 0 ? 0 : s.length - last - 1;
  // One kind of separator with three digits after the last one is a thousands separator ("1.200", "1,200").
  const decimals = tail === 3 && !(s.includes('.') && s.includes(',')) ? 0 : tail;
  const n = decimals > 2 ? Number.NaN : Number(s.replace(/[.,]/g, '')) / 10 ** decimals;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** EUR, GBP, or the price's own symbol ("Kč", "zł", "kr") for other currencies; undefined without a price. */
function currencyOf(text: string): string | undefined {
  if (/€|EUR/.test(text)) return 'EUR';
  if (/£|GBP/.test(text)) return 'GBP';
  const symbol = clean(text.replace(/[\d.,\s]/g, ' '));
  return /\d/.test(text) && symbol ? symbol : undefined;
}

const meta = (prop: string): string | undefined =>
  document.querySelector<HTMLMetaElement>(`meta[property="${prop}"], meta[name="${prop}"]`)?.content || undefined;
const text = (selector: string): string => clean(document.querySelector<HTMLElement>(selector)?.innerText);
/** Some sites put HTML into structured data descriptions. */
const plain = (html: string | undefined): string => clean(html && new DOMParser().parseFromString(html, 'text/html').body.textContent);

/** "Label: value" from detail rows: <dl> pairs, or the first two lines of a row ("Zustand\nSehr gut"). */
function detailRows(selector: string): string[] {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (el.tagName === 'DL') {
      for (const dt of el.querySelectorAll('dt')) {
        const dd = dt.nextElementSibling;
        if (dd?.tagName === 'DD') out.push(`${clean(dt.textContent)}: ${clean(dd.textContent)}`);
      }
    } else {
      out.push(el.innerText.split('\n').map(clean).filter(Boolean).slice(0, 2).join(': '));
    }
  }
  return [...new Set(out)].filter((a) => a.length > 2 && a.length <= 200).slice(0, 12);
}

type Offer = { price?: number | string; priceCurrency?: string; url?: string };
interface JsonLdProduct {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  url?: string;
  sku?: string;
  image?: string | string[];
  category?: string;
  brand?: string | { name?: string };
  offers?: Offer | Offer[];
}

function jsonLdProducts(): JsonLdProduct[] {
  const out: JsonLdProduct[] = [];
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(el.textContent ?? '') as unknown;
      for (const node of [data, ...((data as { '@graph'?: unknown[] })['@graph'] ?? [])].flat() as JsonLdProduct[]) {
        const type = node?.['@type'];
        if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) out.push(node);
      }
    } catch {
      // not JSON: skip
    }
  }
  return out;
}

const offerOf = (p: JsonLdProduct | undefined): Offer | undefined => (Array.isArray(p?.offers) ? p.offers[0] : p?.offers);

/**
 * The structured data of THIS listing. Single-page sites (Vinted, Wallapop, leboncoin) navigate without reloading,
 * so data from an earlier listing may still be in the page: it must name the listing id.
 */
function productFor(id: string): JsonLdProduct | undefined {
  return jsonLdProducts().find((p) => [p.url, p.sku, offerOf(p)?.url].some((u) => u?.includes(id)));
}

export interface Adapter {
  marketplace: MarketplaceId;
  /** The listing id when the URL is a single listing. */
  listingId(url: URL): string | undefined;
  /** undefined while the page is not ready; `final` reads whatever is there. */
  read(url: URL, id: string, final: boolean): ListingData | undefined;
}

interface Site {
  marketplace: MarketplaceId;
  /** Listing pages; group 1 is the listing id as it appears in the structured data. */
  path: RegExp;
  description?: string;
  /** Use the structured data description (off where it is boilerplate). */
  ldDescription?: boolean;
  /** Fall back to og:description (eBay keeps the seller's text in an iframe). */
  metaDescription?: boolean;
  attributes?: string;
  /** Status words in front of the title ("(reserviert) ..."). */
  titlePrefix?: RegExp;
}

function structured(site: Site): Adapter {
  return {
    marketplace: site.marketplace,
    listingId: (url) => site.path.exec(url.pathname)?.[1],
    read(url, id, final) {
      const ld = productFor(id);
      if (!ld && !final) return undefined;
      const offer = offerOf(ld);
      // plain(): eBay.co.uk sends "Console &amp; Wires" in structured data.
      const title = (plain(ld?.name) || text('main h1') || text('h1')).replace(site.titlePrefix ?? /^$/, '');
      if (!title) return undefined;
      const description =
        (site.description && text(site.description)) ||
        (site.ldDescription !== false ? plain(ld?.description) : '') ||
        (site.metaDescription ? clean(meta('og:description')) : '');
      const attributes = site.attributes ? detailRows(site.attributes) : [];
      const brand = typeof ld?.brand === 'string' ? ld.brand : ld?.brand?.name;
      if (brand && !attributes.some((a) => a.includes(brand))) attributes.unshift(`Brand: ${brand}`);
      if (ld?.category) attributes.push(`Category: ${ld.category}`);
      const image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) || meta('og:image');
      const price = offer?.price !== undefined ? Number(offer.price) : undefined;
      return {
        marketplace: site.marketplace,
        url: url.origin + url.pathname,
        title,
        ...(description && { description: description.slice(0, 4000) }),
        attributes,
        ...(image?.startsWith('https://') && { imageUrl: image }),
        ...(price && Number.isFinite(price) && { price }),
        ...(offer?.priceCurrency && { currency: offer.priceCurrency }),
      };
    },
  };
}

const vinted: Adapter = {
  marketplace: 'vinted',
  listingId: (url) => /^\/items\/(\d+)/.exec(url.pathname)?.[1],
  read(url, id, final) {
    const ld = jsonLdProducts().find((p) => [p.url, offerOf(p)?.url].some((u) => u?.includes(`/items/${id}`)));
    if (!ld && !final) return undefined;
    const offer = offerOf(ld);
    const title = clean(ld?.name) || text('[data-testid="item-page-summary-plugin"] h1') || text('main h1');
    if (!title) return undefined;
    // Upload date, views and location say nothing about the item.
    const attributes = detailRows('[data-testid^="item-attributes-"]:not([data-testid*="upload_date"]):not([data-testid*="view_count"]):not([data-testid*="interested"]):not([data-testid*="location"]):not([data-testid*="payment"])');
    const brand = typeof ld?.brand === 'string' ? ld.brand : ld?.brand?.name;
    if (brand && !attributes.some((a) => a.includes(brand))) attributes.unshift(`Brand: ${brand}`);
    if (ld?.category) attributes.push(`Category: ${ld.category}`);
    const priceText = text('[data-testid="item-price"]');
    const image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) ?? document.querySelector<HTMLImageElement>('[data-testid^="item-photo-"] img')?.src;
    const description = clean(ld?.description) || text('[itemprop="description"]');
    // The page shows the price converted to the viewer's currency; structured data keeps the seller's (PLN for a Polish
    // seller on vinted.si), so the visible price wins.
    const shown = parsePrice(priceText);
    const price = shown ?? (offer?.price !== undefined ? Number(offer.price) : undefined);
    const currency = shown ? currencyOf(priceText) : offer?.priceCurrency;
    return {
      marketplace: 'vinted',
      url: url.origin + url.pathname,
      title,
      ...(description && { description }),
      attributes,
      ...(image?.startsWith('https://') && { imageUrl: image }),
      ...(price && Number.isFinite(price) && { price }),
      ...(currency && { currency }),
    };
  },
};

const kleinanzeigen: Adapter = {
  marketplace: 'kleinanzeigen',
  listingId: (url) => /^\/s-anzeige\/.+\/(\d+)-/.exec(url.pathname)?.[1],
  read(url) {
    // "Reserviert • Gelöscht • " prefixes are status, not part of the title.
    const title = text('#viewad-title').replace(/^((Reserviert|Gelöscht)\s*•\s*)+/i, '') || clean(meta('og:title'));
    if (!title) return undefined;
    const priceText = text('#viewad-price');
    // Two page layouts are live (A/B, 2026-10): the classic one with addetailslist classes and a Tailwind one where
    // only the viewad-* ids stay. Detail rows are "label<span>value</span>" in the first, two spans in a <li> in the second.
    let attributes = detailRows('.addetailslist--detail');
    if (attributes.length === 0) {
      const rows = [...document.querySelectorAll<HTMLElement>('main li, #viewad-main li')].filter((li) => li.children.length === 2 && [...li.children].every((c) => c.tagName === 'SPAN'));
      attributes = rows.map((li) => li.innerText.split('\n').map(clean).filter(Boolean).slice(0, 2).join(': ')).filter((a) => a.length > 2 && a.length <= 120).slice(0, 12);
    }
    if (/VB/.test(priceText)) attributes.push('Price: negotiable (VB)');
    const shipping = text('.boxedarticle--details--shipping') || clean([...document.querySelectorAll('span')].find((e) => /^\s*\+ Versand/.test(e.textContent ?? ''))?.textContent);
    if (shipping) attributes.push(`Shipping: ${shipping.replace(/^\+\s*/, '')}`);
    const description = text('#viewad-description-text');
    // og:image is the site logo in the newer layout.
    const og = meta('og:image');
    // "AUTO" lets the image server pick AVIF, which the recognition model does not read; JPG is always available.
    const image = (document.querySelector<HTMLImageElement>('#viewad-image')?.src || (og?.includes('/prod-ads/') ? og : undefined))?.replace(/\.AUTO$/, '.JPG');
    const price = parsePrice(priceText);
    return {
      marketplace: 'kleinanzeigen',
      url: url.origin + url.pathname,
      title,
      ...(description && { description }),
      attributes,
      ...(image?.startsWith('https://') && { imageUrl: image }),
      ...(price && { price }),
      currency: 'EUR',
    };
  },
};

/** Checked 2026-10-22 on live listings. */
const ADAPTERS: [hosts: RegExp, adapter: Adapter][] = [
  [/(^|\.)vinted\./, vinted],
  [/(^|\.)kleinanzeigen\.de$/, kleinanzeigen],
  [/(^|\.)subito\.it$/, structured({ marketplace: 'subito', path: /^\/[a-z-]+\/[^/]*-(\d+)\.htm$/, description: 'p[class*="__description"]' })],
  [/(^|\.)leboncoin\.fr$/, structured({ marketplace: 'leboncoin', path: /^\/ad\/[a-z_]+\/(\d+)/ })],
  [
    /(^|\.)wallapop\.com$/,
    structured({ marketplace: 'wallapop', path: /^\/item\/([a-z0-9-]+-\d+)$/i, description: '[class*="ProductDescription"]', attributes: 'dl[class*="ProductDetailFeatures"]' }),
  ],
  [
    /(^|\.)(marktplaats\.nl|2dehands\.be|2ememain\.be)$/,
    structured({ marketplace: 'marktplaats', path: /^\/v\/.+\/([am]\d+)-/, description: '[class*="Description-module-description"]', attributes: '[class*="Attributes-module-item"]' }),
  ],
  [
    /(^|\.)willhaben\.at$/,
    structured({
      marketplace: 'willhaben',
     
      path: /^\/iad\/kaufen-und-verkaufen\/d\/.*-(\d+)\/?$/,
      // Structured data carries an SEO sentence instead of the seller's text.
      ldDescription: false,
      description: '[data-testid^="ad-description-"]',
      attributes: '[data-testid="attribute-item"]',
      titlePrefix: /^\((reserviert|verkauft)\)\s*/i,
    }),
  ],
  [
    /(^|\.)ebay\.(de|at|ch|fr|it|es|nl|be|co\.uk|ie|pl)$/,
    structured({
      marketplace: 'ebay',
     
      path: /^\/itm\/(?:[^/]+\/)?(\d+)/,
      metaDescription: true,
      attributes: '[data-testid="x-about-this-item"] dl, [data-testid="x-about-this-item"] .ux-labels-values',
    }),
  ],
];

export const adapterFor = (hostname: string): Adapter | undefined => ADAPTERS.find(([hosts]) => hosts.test(hostname))?.[1];
