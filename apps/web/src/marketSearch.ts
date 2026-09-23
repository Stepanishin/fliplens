/**
 * Deep links to marketplace search pages that the USER opens in their own browser.
 * We never fetch, store or parse these pages (no legal access to that data, see docs/DATA_SOURCES.md).
 * URL patterns checked 2026-09-23.
 */

export interface MarketLink {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly note?: string;
}

interface MarketDef {
  readonly id: string;
  readonly name: string;
  /** ISO country codes where this marketplace matters. */
  readonly countries: readonly string[];
  readonly url: (q: string, country: string) => string;
  readonly note?: string;
}

/** Vinted domain per country. */
const VINTED_DOMAIN: Record<string, string> = {
  AT: 'vinted.at', BE: 'vinted.be', CZ: 'vinted.cz', DE: 'vinted.de', DK: 'vinted.dk', ES: 'vinted.es',
  FI: 'vinted.fi', FR: 'vinted.fr', GR: 'vinted.gr', HR: 'vinted.hr', HU: 'vinted.hu', IE: 'vinted.ie',
  IT: 'vinted.it', LT: 'vinted.lt', LU: 'vinted.lu', NL: 'vinted.nl', PL: 'vinted.pl', PT: 'vinted.pt',
  RO: 'vinted.ro', SE: 'vinted.se', SI: 'vinted.si', SK: 'vinted.sk', GB: 'vinted.co.uk',
};

/** eBay site per country (for the sold-items search, which needs the user to be logged in). */
const EBAY_DOMAIN: Record<string, string> = {
  DE: 'ebay.de', AT: 'ebay.at', CH: 'ebay.ch', FR: 'ebay.fr', IT: 'ebay.it', ES: 'ebay.es', NL: 'ebay.nl',
  BE: 'befr.ebay.be', IE: 'ebay.ie', PL: 'ebay.pl', GB: 'ebay.co.uk',
};

const enc = encodeURIComponent;
const plus = (q: string): string => enc(q).replace(/%20/g, '+');
const dashes = (q: string): string => enc(q.toLowerCase().trim().replace(/\s+/g, '-'));

const MARKETS: readonly MarketDef[] = [
  {
    id: 'vinted',
    name: 'Vinted',
    countries: Object.keys(VINTED_DOMAIN),
    url: (q, c) => `https://www.${VINTED_DOMAIN[c] ?? 'vinted.de'}/catalog?search_text=${enc(q)}`,
  },
  {
    id: 'ebay_sold',
    name: 'eBay sold',
    countries: Object.keys(EBAY_DOMAIN),
    url: (q, c) => `https://www.${EBAY_DOMAIN[c] ?? 'ebay.de'}/sch/i.html?_nkw=${plus(q)}&LH_Sold=1&LH_Complete=1`,
    note: 'login required',
  },
  { id: 'kleinanzeigen', name: 'Kleinanzeigen', countries: ['DE'], url: (q) => `https://www.kleinanzeigen.de/s-${dashes(q)}/k0` },
  { id: 'willhaben', name: 'willhaben', countries: ['AT'], url: (q) => `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=${enc(q)}` },
  { id: 'leboncoin', name: 'leboncoin', countries: ['FR'], url: (q) => `https://www.leboncoin.fr/recherche?text=${enc(q)}` },
  { id: 'wallapop', name: 'Wallapop', countries: ['ES', 'IT', 'PT'], url: (q, c) => `https://${c === 'IT' ? 'it' : c === 'PT' ? 'pt' : 'es'}.wallapop.com/search?keywords=${plus(q)}` },
  { id: 'subito', name: 'Subito', countries: ['IT'], url: (q) => `https://www.subito.it/annunci-italia/vendita/usato/?q=${enc(q)}` },
  { id: 'marktplaats', name: 'Marktplaats', countries: ['NL'], url: (q) => `https://www.marktplaats.nl/q/${plus(q)}/` },
  { id: '2dehands', name: '2dehands', countries: ['BE'], url: (q) => `https://www.2dehands.be/q/${plus(q)}/` },
  { id: 'olx_pl', name: 'OLX', countries: ['PL'], url: (q) => `https://www.olx.pl/oferty/q-${dashes(q)}/` },
  { id: 'allegro', name: 'Allegro', countries: ['PL', 'CZ', 'SK', 'HU'], url: (q) => `https://allegro.pl/listing?string=${enc(q)}` },
  { id: 'bazos', name: 'Bazoš', countries: ['CZ'], url: (q) => `https://www.bazos.cz/search.php?hledat=${enc(q)}` },
  { id: 'bolha', name: 'Bolha', countries: ['SI'], url: (q) => `https://www.bolha.com/?ctl=search_ads&keywords=${enc(q)}` },
  { id: 'njuskalo', name: 'Njuškalo', countries: ['HR'], url: (q) => `https://www.njuskalo.hr/search/?keywords=${enc(q)}` },
  { id: 'tradera', name: 'Tradera', countries: ['SE'], url: (q) => `https://www.tradera.com/search?q=${enc(q)}` },
  { id: 'fb', name: 'Facebook Marketplace', countries: ['*'], url: (q) => `https://www.facebook.com/marketplace/search/?query=${enc(q)}` },
];

export const LINK_COUNTRIES = [
  'AT', 'BE', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'GB',
] as const;

/** Links for the user's country first (Vinted always first), then the big marketplaces of neighbouring markets. */
export function marketLinks(query: string, country: string): { local: MarketLink[]; other: MarketLink[] } {
  const q = query.trim();
  const local: MarketLink[] = [];
  const other: MarketLink[] = [];
  for (const m of MARKETS) {
    const isLocal = m.countries.includes(country) || m.countries.includes('*');
    const c = isLocal ? country : m.countries[0]!;
    const link = { id: m.id, name: isLocal ? m.name : `${m.name} ${c}`, url: m.url(q, c), ...(m.note && { note: m.note }) };
    (isLocal ? local : other).push(link);
  }
  return { local, other };
}
