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
  'ohrpolster', 'polster', 'earpads', 'kopfband', 'headband', 'diadema', 'coussinets', 'almohadillas',
]);

/**
 * Nouns that make the listing an accessory or spare part anywhere in the title.
 * Only words that almost never appear in a listing of the complete product: "with new ear pads" or
 * "with lens cap" are normal extras, so those are matched only as the first word or after "for".
 */
const ACCESSORY_ANYWHERE = words([
  'screen protector', 'schutzfolie', 'panzerglas', 'displayschutz', 'skin', 'decal', 'sticker', 'faceplate',
  'scharnier', 'hinge', 'replacement part', 'ersatz ?polster', 'ersatzbugel', 'ersatzband',
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
    // "... e 3 Giochi", "2 Spiele", "w/ games", "mit Spielen"
    String.raw`(?<![a-z0-9])\d{1,2}\s?(?:games|spiele|spielen|jeux|giochi|juegos|gier|spellen)(?![a-z])`,
    String.raw`(?:w/|with|mit|avec|con|inkl\.?|incl\.?)\s?(?:games|spiele|spielen|jeux|giochi|juegos|gier|spellen)(?![a-z])`,
  ].join('|'),
);

/** Words right after the model that turn it into a different variant. */
const VARIANT_SUFFIXES = new Set([
  'pro', 'max', 'plus', 'mini', 'lite', 'oled', 'ultra', 'slim', 'se', 'fe', 'air',
  'xl', 'ii', 'iii', 'iv', 'mark', 'mk', 'mkii', 'mkiii', 'gen', 'nd', 'rd', 'th', 'edge',
]);
const GENERATION_TOKEN = /^(?:[1-9])(?:st|nd|rd|th)?$/;
/** A number right after the model followed by one of these is a spec, not a generation ("OLED 7 Zoll", "13 2 Jahre"). */
const NUMBER_UNIT_AFTER = /^\s*(?:zoll|inch|inches|pollici|pouces|pulgadas|cali|duim|"|''|gb|tb|x\b|%|jahre?|years?|anni|ans|anos|mesi|monate|months?|mois|meses|stuck|pcs)/;

/** Special / limited editions are priced differently from the base model. */
const EDITION = words([
  'limited edition', 'special edition', 'collectors? edition', 'edition limitee', 'edizione limitata',
  'edicion limitada', 'sonderedition', '[a-z]+ edition',
  'anniversary', 'aniversario', 'anniversario', 'anniversaire', 'jubilaums',
]);

/**
 * Console variants that sellers put anywhere in the title ("PlayStation 5 (PS5 Pro)", "Edicion Digital ... Slim").
 * Only for consoles: "digital" or "pro" in a camera or phone title means something else.
 */
const CONSOLE_VARIANT_ANYWHERE = /(?<![a-z0-9])(pro|slim|digital|digitale|lite|oled)(?![a-z0-9])(?!\s*(?:controller|pad|joy|gamepad|headset|stand|case))/;
/** Words after which the rest of the title lists extras: "Switch OLED mit Pro Controller". */
const EXTRAS_START = /(?<![a-z0-9])(?:mit|with|w\/|inkl|incl|avec|con|und|and|plus|\+|&)(?![a-z0-9])/;

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

/** Memory cards / extra storage next to a capacity: "128GB SD-Karte", "micro SD 256 GB". Not the device's own storage. */
const MEMORY_CARD = /(?:micro\s?sd|sd|speicherkarte|karte|card|carte|scheda|tarjeta|memory|ssd|hdd|festplatte)/;

/** Device capacities in GB found in a title ("128GB", "1 TB"), ignoring memory cards and external drives. */
export function parseCapacitiesGb(normalizedTitle: string): number[] {
  const out: number[] = [];
  for (const m of normalizedTitle.matchAll(/(?<![0-9])(\d{1,4})\s?(gb|tb)(?![a-z])/g)) {
    const around = normalizedTitle.slice(Math.max(0, m.index - 12), m.index + m[0].length + 14);
    if (MEMORY_CARD.test(around)) continue;
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

  // Only siblings that are not part of our own model name: "Switch" must not exclude every "Switch 2" title.
  const ownModel = compact(product.model);
  for (const other of product.excludeModels ?? []) {
    if (ownModel.includes(compact(other))) continue;
    if (looseModelRegex(other).test(t)) return { reason: 'wrong_variant', similarity: 0, detail: other };
  }

  // What follows the model: digit continuation ("iPhone 1" vs "iPhone 15") or a variant suffix ("Switch" vs "Switch OLED").
  const after = t.slice(modelMatch.index + modelMatch[0].length);
  const lastModelChar = modelMatch[0].slice(-1);
  if (/[0-9]/.test(lastModelChar) && /^[0-9]/.test(after)) {
    return { reason: 'wrong_variant', similarity: 0, detail: 'digit continuation' };
  }
  // "Galaxy S23+" is a variant; "Switch OLED + 4 Joy-Cons" is just a list of extras.
  if (after.startsWith('+')) return { reason: 'wrong_variant', similarity: 0, detail: '+' };
  // After " + " / " & " / "," comes a list of extras, not part of the model name.
  const nextToken = /^\s*[+&,/]/.test(after) ? undefined : after.match(/^[^a-z0-9]*([a-z0-9]+)/)?.[1];
  const ownTokens = new Set(
    normalizeText([product.model, product.variant ?? '', product.generation ?? ''].join(' ')).split(/[^a-z0-9]+/),
  );
  if (nextToken !== undefined && !ownTokens.has(nextToken)) {
    const afterToken = after.slice(after.indexOf(nextToken) + nextToken.length);
    const isGeneration = GENERATION_TOKEN.test(nextToken) && !NUMBER_UNIT_AFTER.test(afterToken);
    if (VARIANT_SUFFIXES.has(nextToken) || isGeneration) {
      return { reason: 'wrong_variant', similarity: 0, detail: nextToken };
    }
  }

  const ownText = normalizeText(`${product.model} ${product.variant ?? ''}`);
  if (product.category === 'consoles' || product.category === 'handhelds') {
    const main = t.split(EXTRAS_START)[0] ?? t;
    const v = CONSOLE_VARIANT_ANYWHERE.exec(main);
    if (v && !ownText.split(/[^a-z0-9]+/).includes(v[1]!)) return { reason: 'wrong_variant', similarity: 0, detail: v[1]! };
  }
  const edition = EDITION.exec(t);
  if (edition && !ownText.includes(edition[0])) return { reason: 'wrong_variant', similarity: 0, detail: edition[0] };

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
