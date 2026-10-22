import type { CategorySlug, Condition, FashionAttributes, FeePresetId, InsufficientData, Valuation } from '@fliplens/core';

/** FlipLens origin, set at build time (scripts/build.mjs). */
declare const __APP_URL__: string;
export const APP_URL = __APP_URL__;

/** Marketplaces the extension reads listings on (src/sites.ts), with the name stored as the inventory source. */
export const MARKETPLACES = {
  vinted: 'Vinted',
  kleinanzeigen: 'Kleinanzeigen',
  subito: 'Subito',
  leboncoin: 'leboncoin',
  wallapop: 'Wallapop',
  marktplaats: 'Marktplaats',
  willhaben: 'willhaben',
  ebay: 'eBay',
} as const;
export type MarketplaceId = keyof typeof MARKETPLACES;

/** What a content script reads from a marketplace listing page. */
export interface ListingData {
  marketplace: MarketplaceId;
  url: string;
  title: string;
  description?: string;
  /** "Name: value" pairs from the page (brand, size, condition, ...). */
  attributes: string[];
  imageUrl?: string;
  /** Item price as listed, in major units. */
  price?: number;
  currency?: string;
}

/** The web app's settings, copied from its localStorage by app-session.ts. */
export interface Settings {
  preset: FeePresetId;
  shippingCost: number;
  targetRoiPct: number;
  country: string;
}

export interface Session {
  deviceId: string;
  settings: Settings;
  clothesOnVinted: boolean;
}

export interface Money {
  amountMinor: number;
  currency: string;
}

/** The valuation result as the API sends it (core types; the fields the panel reads carry no dates). */
export type Verdict = Valuation | InsufficientData;

/** The part of POST /api/valuation's answer the extension shows. */
export interface ValuationResponse {
  scanId?: string;
  category: CategorySlug;
  fashion?: FashionAttributes;
  feePreset: { id: FeePresetId; label: string };
  result: Verdict;
  alt?: { preset: FeePresetId; label: string; result: Verdict };
}

export interface CheckResult {
  /** name: brand + model, or brand + style for clothes ("Nike Air Force 1", not "Nike sneakers"). */
  product: { name: string; category: CategorySlug; confidence: number };
  condition: Condition;
  purchasePrice: number;
  valuation: ValuationResponse;
}

export type Request =
  | { type: 'session'; session: Session }
  | { type: 'check'; listing: ListingData; price: number }
  | { type: 'bought'; scanId: string; price: number; listing: ListingData }
  | { type: 'status' };

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string; message?: string; status?: number };

export interface Status {
  connected: boolean;
  account: { email: string | null; name: string | null } | null;
  quota: { plan: string; used: number; limit: number; remaining: number } | null;
}

export async function send<T>(req: Request): Promise<Reply<T>> {
  try {
    return (await chrome.runtime.sendMessage(req)) as Reply<T>;
  } catch (e) {
    // The extension was updated or reloaded: this page's script is orphaned until a reload.
    return { ok: false, error: 'extension_reloaded', message: e instanceof Error ? e.message : String(e) };
  }
}

const LANG = navigator.language.slice(0, 2);

export function formatMoney(m: Money): string {
  return new Intl.NumberFormat(navigator.language, { style: 'currency', currency: m.currency, maximumFractionDigits: m.amountMinor % 100 === 0 ? 0 : 2 }).format(m.amountMinor / 100);
}

const STRINGS = {
  en: {
    check: 'Check resale profit',
    checking: 'Checking eBay prices…',
    yourPrice: 'Your price',
    inclProtection: 'incl. Vinted Buyer Protection',
    expected: 'Resells for',
    profit: 'Profit',
    maxBuy: 'Max to pay',
    on: 'on',
    listings: 'eBay listings',
    bought: 'I bought it',
    added: 'Added to your stock',
    openApp: 'Open FlipLens',
    signIn: 'Sign in at FlipLens',
    upgrade: 'See plans',
    retry: 'Check again',
    notConnected: 'Open FlipLens once in this browser and sign in, then reload this page.',
    notIdentified: 'Could not tell which product this is.',
    lowConfidence: 'Not sure which product this is: check the result in FlipLens.',
    fewComparables: 'Not enough comparable listings on eBay to price this.',
    unsure: 'unsure',
    reloaded: 'FlipLens was updated. Reload this page.',
    noPrice: 'Enter the price you would pay.',
    foreignCurrency: 'The listing is priced in {c}: enter the total in {m}.',
    strong_buy: 'STRONG BUY',
    buy: 'BUY',
    borderline: 'BORDERLINE',
    skip: 'SKIP',
  },
  de: {
    check: 'Wiederverkauf prüfen',
    checking: 'eBay-Preise werden geprüft…',
    yourPrice: 'Dein Preis',
    inclProtection: 'inkl. Vinted-Gebühr',
    expected: 'Verkaufbar für',
    profit: 'Gewinn',
    maxBuy: 'Maximal zahlen',
    on: 'auf',
    listings: 'eBay-Angebote',
    bought: 'Gekauft',
    added: 'Zum Bestand hinzugefügt',
    openApp: 'FlipLens öffnen',
    signIn: 'Bei FlipLens anmelden',
    upgrade: 'Tarife ansehen',
    retry: 'Erneut prüfen',
    notConnected: 'Öffne FlipLens einmal in diesem Browser und melde dich an, dann lade diese Seite neu.',
    notIdentified: 'Das Produkt konnte nicht erkannt werden.',
    lowConfidence: 'Produkt nicht sicher erkannt: prüfe das Ergebnis in FlipLens.',
    fewComparables: 'Zu wenige vergleichbare Angebote auf eBay für eine Bewertung.',
    unsure: 'unsicher',
    reloaded: 'FlipLens wurde aktualisiert. Lade diese Seite neu.',
    noPrice: 'Gib den Preis ein, den du zahlen würdest.',
    foreignCurrency: 'Das Angebot ist in {c}: gib den Gesamtpreis in {m} ein.',
    strong_buy: 'KLARER KAUF',
    buy: 'KAUFEN',
    borderline: 'GRENZWERTIG',
    skip: 'FINGER WEG',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['en'];
export const t = (k: StringKey): string => (LANG === 'de' ? STRINGS.de : STRINGS.en)[k];
