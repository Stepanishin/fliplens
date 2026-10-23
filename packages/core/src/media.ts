import { compact, matchTitle, normalizeText, type MatchResult } from './matching.js';
import type { CategorySlug, NormalizedProduct } from './types.js';

/**
 * LEGO sets, books, vinyl, CDs, DVDs and Blu-rays (ADR-029). These have exact identities: a LEGO set number, an ISBN or
 * EAN, an artist plus album title. Product fields: LEGO brand "LEGO", model = set number; books brand = author,
 * model = title; music brand = artist, model = album; movies brand = format ("DVD", "Blu-ray", "4K"), model = title.
 */

export const MEDIA_CATEGORIES: ReadonlySet<CategorySlug> = new Set(['lego', 'books', 'vinyl', 'cds', 'movies']);
export const isMedia = (c: CategorySlug): boolean => MEDIA_CATEGORIES.has(c);
/** Books, music and films are searched by their barcode when we have it: the exact edition, across sites. */
export const searchesByGtin = (p: NormalizedProduct): boolean => p.gtin !== undefined && ['books', 'vinyl', 'cds', 'movies'].includes(p.category);

const words = (list: readonly string[]): RegExp => new RegExp(`(?<![a-z0-9])(?:${list.join('|')})(?![a-z0-9])`);

const MEDIA_BUNDLE = new RegExp(
  [
    words(['konvolut', 'sammlung', 'bundle', 'job lot', 'lot of', 'lot de', 'lote de', 'lotto', 'paket', 'pakket', 'collection of', 'set of']).source,
    String.raw`(?<![a-z0-9])\d{1,3}\s?(?:x\s)?(?:bucher|books|livres|libri|libros|boeken|cds|lps|schallplatten|records|vinyls?|dvds|blu-?rays|filme|films|sets|teile|pcs|pieces|pezzi|piezas)(?![a-z])`,
  ].join('|'),
);

/** LEGO listings that are not the complete set. */
const LEGO_PART = new RegExp(
  [
    String.raw`(?:nur|only|seule?s?|solo|alleen)\s+(?:die\s+)?(?:bau)?(?:anleitung|instructions?|notice|istruzioni|instrucciones|handleiding)`,
    String.raw`(?:bau)?(?:anleitung|instructions?|notice|istruzioni|instrucciones|handleiding)\s+(?:nur|only|seule?|solo|alleen)`,
    String.raw`(?:ohne|without|sans|senza|sin|zonder)\s+(?:\w+\s){0,2}(?:figuren|minifiguren|minifigs?|minifigures?|figurines?|minifiguras|poppetjes|ovp|box)`,
    words(['minifig only', 'nur minifigur', 'nur figur', 'stickers?', 'aufkleber', 'sticker sheet', 'ersatzteil', 'einzelteile', 'parts', 'pieces only', 'unvollstandig', 'incomplete', 'incomplet', 'incompleto', 'onvolledig']).source,
    // Instruction books and single assemblies sold on their own.
    words(['libros? de instrucciones', 'libretto istruzioni', 'libretti istruzioni', 'instruction (?:manual|booklet|book)s?', 'anleitungshefte?', 'bauanleitungen', 'notices? de montage']).source,
  ].join('|'),
);
/** Copies and compatible bricks are a different product at a fraction of the price. */
const LEGO_COPY = words(['kompatibel', 'compatible', 'compatibile', 'nicht original', 'not lego', 'klemmbausteine', 'lepin', 'mould king', 'bluebrixx', 'cada', 'replica', 'moc']);

const FORMAT: readonly [string, RegExp][] = [
  ['4k', /(?<![a-z0-9])(?:4k|uhd|ultra hd)(?![a-z0-9])/],
  ['blu-ray', /(?<![a-z0-9])blu[\s-]?ray(?![a-z0-9])/],
  ['dvd', /(?<![a-z0-9])dvd(?![a-z0-9])/],
];
const formatOf = (s: string): string | undefined => FORMAT.find(([, re]) => re.test(s))?.[0];

function looseWords(text: string): RegExp {
  const parts = normalizeText(text).split(/[^a-z0-9]+/).filter((w) => w.length > 0);
  return new RegExp(`(?<![a-z0-9])${parts.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^a-z0-9]*')}(?![a-z0-9])`);
}

/** Set number in a LEGO model ("75192", "10294-1", "Millennium Falcon 75192"). */
export const legoSetNumber = (model: string): string | undefined => model.match(/(?<!\d)(\d{4,7})(?:-\d)?(?!\d)/)?.[1];

export function matchMediaTitle(p: NormalizedProduct, title: string): MatchResult {
  const t = normalizeText(title);
  if (MEDIA_BUNDLE.test(t)) return { reason: 'bundle', similarity: 0 };

  if (p.category === 'lego') {
    if (LEGO_COPY.test(t)) return { reason: 'wrong_variant', similarity: 0, detail: 'copy' };
    if (LEGO_PART.test(t)) return { reason: 'accessory_only', similarity: 0, detail: 'incomplete' };
    const set = legoSetNumber(p.model);
    if (set) {
      // The number alone, not part of a longer one: 75192 must not match 751920 or a price "1075192".
      // Piece counts ("1254 Teile") and years are not set numbers.
      const nums = [...t.matchAll(/(?<!\d)(\d{4,7})(?!\d)(?!\s?(?:teile|tlg|stuck|stk|pcs|pieces|pezzi|piezas|pieces|onderdelen|eur|euro))/g)].map((m) => m[1]!);
      if (!nums.includes(set)) return { reason: 'model_not_found', similarity: 0, detail: 'set number' };
      const other = nums.find((n) => n !== set && n.length === set.length && !/^(19|20)\d\d$/.test(n));
      return other ? { reason: 'bundle', similarity: 0, detail: `also ${other}` } : { similarity: 1 };
    }
    return looseWords(p.model).test(t) ? { similarity: 0.8 } : { reason: 'model_not_found', similarity: 0 };
  }

  if (p.category === 'movies') {
    const want = formatOf(normalizeText(`${p.brand} ${p.variant ?? ''}`));
    const have = formatOf(t);
    if (want && have && want !== have) return { reason: 'wrong_variant', similarity: 0, detail: have };
  }

  // Searched by barcode: every result is this edition.
  if (searchesByGtin(p)) return { similarity: 1 };

  if (compact(p.model).length > 0 && !looseWords(p.model).test(t)) return { reason: 'model_not_found', similarity: 0, detail: 'title' };
  // Music: the artist must be named too ("21", "Greatest Hits" are not unique). Books: titles often omit the author,
  // so it only raises similarity. Films: "brand" is the format.
  const named = compact(p.brand).length >= 2 && looseWords(p.brand).test(t);
  if ((p.category === 'vinyl' || p.category === 'cds') && compact(p.brand).length >= 2 && !named) {
    return { reason: 'model_not_found', similarity: 0, detail: 'artist' };
  }
  return { similarity: p.category === 'books' && !named ? 0.8 : 0.9 };
}

/** Wristwatches: matched like devices (model or reference in the title), minus fakes, homages and loose parts. */
const WATCH_FAKE = words(['replica', 'replika', 'fake', 'homage', 'hommage', 'omaggio', 'nachbau', 'style', 'look ?alike', 'aaa']);
const WATCH_PART = words(['zifferblatt', 'dial only', 'nur zifferblatt', 'lunette', 'bezel insert', 'inlay', 'uhrwerk', 'movement only', 'gehause', 'case only', 'strap only', 'nur armband', 'band only', 'crown', 'krone', 'glas', 'crystal', 'ersatzteil', 'spare']);

export function matchWatchTitle(p: NormalizedProduct, title: string): MatchResult {
  const t = normalizeText(title);
  if (WATCH_FAKE.test(t)) return { reason: 'wrong_variant', similarity: 0, detail: 'homage/replica' };
  if (WATCH_PART.test(t)) return { reason: 'accessory_only', similarity: 0, detail: 'part' };
  return matchTitle(p, title);
}
