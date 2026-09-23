import type { ExclusionReason, NormalizedProduct } from './types.js';

/**
 * Rule-based title matcher (v1). Decides whether a listing title is the same product/variant.
 * Multi-language keyword lists: EN, DE, FR, IT, ES, NL, PL. Titles are lowercased and diacritics stripped first.
 */

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');
}

export function compact(s: string): string {
  return normalizeText(s).replace(/[^a-z0-9]/g, '');
}

const words = (list: readonly string[]): RegExp =>
  new RegExp(`(?<![a-z0-9])(?:${list.join('|')})(?![a-z0-9])`);

const FOR_PARTS = words([
  'defekt', 'defect', 'defective', 'broken', 'kaputt', 'for parts', 'parts only', 'spares or repair',
  'spares repair', 'not working', 'funktioniert nicht', 'ersatzteile?', 'bastler', 'fur bastler',
  'pour pieces', 'hors service', 'hs', 'en panne', 'per ricambi', 'guasto', 'non funzionante',
  'para piezas', 'averiado', 'no funciona', 'uszkodzony', 'na czesci', 'niesprawny', 'kapot',
  'voor onderdelen',
]);

const BOX_ONLY = words([
  'nur ovp', 'ovp only', 'only box', 'box only', 'empty box', 'leere ovp', 'leerkarton',
  'boite vide', 'boite seule', 'scatola vuota', 'solo scatola', 'caja vacia', 'solo caja',
  'lege doos', 'puste pudelko',
]);

/** Accessory nouns that make the listing an accessory when they are the first word of the title. */
const ACCESSORY_LEAD = new Set([
  'case', 'hulle', 'etui', 'tasche', 'cover', 'bag', 'strap', 'armband', 'charger', 'ladegerat',
  'kabel', 'cable', 'adapter', 'stand', 'halterung', 'housse', 'coque', 'custodia', 'funda',
  'cuscinetti', 'hoesje', 'ladekabel', 'netzteil', 'akku', 'battery', 'batterie',
]);

/** Accessory nouns that make the listing an accessory anywhere in the title. */
const ACCESSORY_ANYWHERE = words([
  'ear ?pads?', 'ohrpolster', 'polster', 'headband', 'kopfband', 'screen protector', 'schutzfolie',
  'panzerglas', 'displayschutz', 'skin', 'decal', 'sticker', 'faceplate', 'coussinets',
  'lens cap', 'objektivdeckel', 'gegenlichtblende', 'lens hood', 'ersatz ?polster',
]);

/** "for / fur / pour / per / para / compatible ..." before the model mention means an accessory. */
const COMPAT = words([
  'for', 'fur', 'pour', 'per', 'para', 'voor', 'do', 'compatible', 'kompatibel', 'passend',
  'replacement', 'ersatz', 'fits', 'geeignet',
]);

const BUNDLE = new RegExp(
  [
    words(['bundle', 'konvolut', 'job lot', 'lot of', 'lote', 'lotto', 'sammlung', 'paket', 'pakket', 'zestaw']).source,
    String.raw`\+\s?\d+\s?(?:games|spiele|jeux|giochi|juegos|gier|spellen)`,
    String.raw`(?:mit|with|avec|con|z|met|inkl\.?|incl\.?|inkl)\s\d+\s?(?:games|spiele|spielen|jeux|giochi|juegos|gier|spellen)`,
  ].join('|'),
);

/** Words right after the model that turn it into a different variant. */
const VARIANT_SUFFIXES = new Set([
  'pro', 'max', 'plus', 'mini', 'lite', 'oled', 'ultra', 'slim', 'digital', 'se', 'fe', 'air',
  'xl', 'ii', 'iii', 'iv', 'mark', 'mk', 'mkii', 'mkiii', 'gen', 'nd', 'rd', 'th', 'edge',
]);
const GENERATION_TOKEN = /^(?:[1-9])(?:st|nd|rd|th)?$/;

/** Canon/Sony mounts the matcher understands. Longer ones first so "ef-s" is not read as "ef". */
const MOUNTS: readonly (readonly [string, RegExp])[] = [
  ['rf-s', /(?<![a-z0-9])rf[\s-]?s(?![a-z])/g],
  ['ef-s', /(?<![a-z0-9])ef[\s-]?s(?![a-z])/g],
  ['ef-m', /(?<![a-z0-9])ef[\s-]?m(?![a-z])/g],
  ['rf', /(?<![a-z0-9])rf(?![a-z])/g],
  ['ef', /(?<![a-z0-9])ef(?![a-z])/g],
  ['fe', /(?<![a-z0-9])fe(?![a-z])/g],
];

export function detectMounts(normalizedTitle: string): Set<string> {
  let rest = normalizedTitle;
  const found = new Set<string>();
  for (const [name, re] of MOUNTS) {
    if (re.test(rest)) {
      found.add(name);
      rest = rest.replace(re, ' ');
    }
    re.lastIndex = 0;
  }
  return found;
}

/** Capacities in GB found in a title ("128GB", "1 TB"). */
export function parseCapacitiesGb(normalizedTitle: string): number[] {
  const out: number[] = [];
  for (const m of normalizedTitle.matchAll(/(?<![0-9])(\d{1,4})\s?(gb|tb)(?![a-z])/g)) {
    const n = Number(m[1]);
    out.push(m[2] === 'tb' ? n * 1024 : n);
  }
  return out;
}

function escapeRe(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex that matches the model with any separators between its characters, e.g. "wh-1000xm4" ~ "WH1000 XM4". */
function looseModelRegex(model: string): RegExp {
  const chars = [...compact(model)].map(escapeRe);
  return new RegExp(chars.join('[^a-z0-9]*'));
}

export interface MatchResult {
  readonly reason?: ExclusionReason;
  readonly similarity: number;
  readonly detail?: string;
}

export function matchTitle(product: NormalizedProduct, title: string): MatchResult {
  const t = normalizeText(title);

  if (FOR_PARTS.test(t)) return { reason: 'for_parts', similarity: 0 };
  if (BOX_ONLY.test(t)) return { reason: 'box_only', similarity: 0 };

  const firstWord = t.match(/[a-z0-9]+/)?.[0];
  if (firstWord !== undefined && ACCESSORY_LEAD.has(firstWord)) {
    return { reason: 'accessory_only', similarity: 0, detail: firstWord };
  }
  if (ACCESSORY_ANYWHERE.test(t)) return { reason: 'accessory_only', similarity: 0 };
  if (BUNDLE.test(t)) return { reason: 'bundle', similarity: 0 };

  const modelMatch = looseModelRegex(product.model).exec(t);
  if (!modelMatch) return { reason: 'model_not_found', similarity: 0 };

  const before = t.slice(0, modelMatch.index);
  if (COMPAT.test(before)) return { reason: 'accessory_only', similarity: 0, detail: 'compat' };

  for (const other of product.excludeModels ?? []) {
    if (looseModelRegex(other).test(t)) return { reason: 'wrong_variant', similarity: 0, detail: other };
  }

  // What follows the model: digit continuation ("iPhone 1" vs "iPhone 15") or a variant suffix ("Switch" vs "Switch OLED").
  const after = t.slice(modelMatch.index + modelMatch[0].length);
  const lastModelChar = modelMatch[0].slice(-1);
  if (/[0-9]/.test(lastModelChar) && /^[0-9]/.test(after)) {
    return { reason: 'wrong_variant', similarity: 0, detail: 'digit continuation' };
  }
  if (after.trimStart().startsWith('+')) return { reason: 'wrong_variant', similarity: 0, detail: '+' };
  const nextToken = after.match(/^[^a-z0-9]*([a-z0-9]+)/)?.[1];
  const ownTokens = new Set(
    normalizeText([product.model, product.variant ?? '', product.generation ?? ''].join(' ')).split(/[^a-z0-9]+/),
  );
  if (nextToken !== undefined && !ownTokens.has(nextToken)) {
    if (VARIANT_SUFFIXES.has(nextToken) || GENERATION_TOKEN.test(nextToken)) {
      return { reason: 'wrong_variant', similarity: 0, detail: nextToken };
    }
  }

  let similarity = 1;

  if (product.capacity !== undefined) {
    const want = parseCapacitiesGb(normalizeText(product.capacity))[0];
    const have = parseCapacitiesGb(t);
    if (want !== undefined && have.length > 0 && !have.includes(want)) {
      return { reason: 'wrong_variant', similarity: 0, detail: `capacity ${have.join('/')}GB` };
    }
    if (have.length === 0) similarity *= 0.85;
  }

  if (product.mount !== undefined) {
    const want = normalizeText(product.mount).replace(/\s/g, '-');
    const have = detectMounts(t);
    if (have.size > 0 && (!have.has(want) || have.size > 1)) {
      return { reason: 'wrong_variant', similarity: 0, detail: `mount ${[...have].join('/')}` };
    }
    if (have.size === 0) similarity *= 0.8;
  }

  return { similarity };
}
