import { compact, normalizeText, type MatchResult } from './matching.js';
import type { CategorySlug, FashionAttributes, FashionGender, FashionKind, NormalizedProduct } from './types.js';

/**
 * Clothes, shoes, bags and accessories (ADR-027). Unlike electronics there is rarely an exact model: a second-hand
 * jacket is priced by brand, type and condition. So the search is "brand (+ named style)" inside the eBay category
 * for that type and department, and a listing matches when it names the brand (and the style, if we have one).
 * The category does the type filtering, which works for titles in any language.
 */

export const FASHION_CATEGORIES: ReadonlySet<CategorySlug> = new Set(['clothing', 'shoes', 'bags', 'accessories', 'jewelry']);
export const isFashion = (c: CategorySlug): boolean => FASHION_CATEGORIES.has(c);

export const FASHION_CATEGORY_OF: Readonly<Record<FashionKind, CategorySlug>> = {
  jeans: 'clothing', trousers: 'clothing', shorts: 'clothing', skirt: 'clothing', dress: 'clothing', jumpsuit: 'clothing',
  top: 'clothing', shirt: 'clothing', sweater: 'clothing', hoodie: 'clothing', jacket: 'clothing', coat: 'clothing',
  suit: 'clothing', swimwear: 'clothing', activewear: 'clothing',
  sneakers: 'shoes', boots: 'shoes', shoes: 'shoes', sandals: 'shoes',
  handbag: 'bags', backpack: 'bags', wallet: 'bags',
  belt: 'accessories', hat: 'accessories', scarf: 'accessories', sunglasses: 'accessories',
  necklace: 'jewelry', bracelet: 'jewelry', ring: 'jewelry', earrings: 'jewelry', charm: 'jewelry',
};

/** eBay departments; IDs are the same on DE, FR, IT, ES, NL and UK (checked 2026-10-19 via the Taxonomy API). */
export const EBAY_FASHION_ROOT = '11450';
const DEPARTMENT: Readonly<Record<Exclude<FashionGender, 'unisex'>, string>> = { women: '260010', men: '260012', kids: '171146' };

/**
 * Jewellery: leaf categories differ per site (DE/UK have fine-jewellery leaves, FR/IT/ES/NL do not), so branded jewellery
 * is searched in "Jewellery & Watches" (281, the same on all six sites) and the type is checked by words in the title.
 */
export const JEWELRY_ROOT = '281';

/** Kids: girls' and boys' categories per group (eBay has no per-type leaves there). */
const KIDS: Readonly<Record<CategorySlug & ('clothing' | 'shoes' | 'bags' | 'accessories' | 'jewelry'), readonly string[]>> = {
  jewelry: [JEWELRY_ROOT],
  clothing: ['11462', '11452'],
  shoes: ['57974', '57929'],
  bags: ['260988'],
  accessories: ['15628', '57881'],
};

/** eBay leaf category per type: [women, men]. */
const LEAF: Readonly<Record<FashionKind, readonly [string, string]>> = {
  jeans: ['11554', '11483'],
  trousers: ['63863', '57989'],
  shorts: ['11555', '15689'],
  skirt: ['63864', '63864'],
  dress: ['63861', '63861'],
  jumpsuit: ['3009', '1059'],
  top: ['53159', '185100'],
  shirt: ['53159', '185100'],
  sweater: ['63866', '11484'],
  hoodie: ['63866', '11484'],
  jacket: ['63862', '57988'],
  coat: ['63862', '57988'],
  suit: ['63865', '3001'],
  swimwear: ['63867', '15690'],
  activewear: ['185098', '185099'],
  sneakers: ['95672', '15709'],
  boots: ['53557', '11498'],
  shoes: ['3034', '93427'],
  sandals: ['62107', '11504'],
  handbag: ['169291', '52357'],
  backpack: ['169291', '52357'],
  wallet: ['45258', '2996'],
  belt: ['3003', '2993'],
  hat: ['45230', '52365'],
  scarf: ['45238', '52382'],
  sunglasses: ['179247', '179239'],
  necklace: [JEWELRY_ROOT, JEWELRY_ROOT],
  bracelet: [JEWELRY_ROOT, JEWELRY_ROOT],
  ring: [JEWELRY_ROOT, JEWELRY_ROOT],
  earrings: [JEWELRY_ROOT, JEWELRY_ROOT],
  charm: [JEWELRY_ROOT, JEWELRY_ROOT],
};

/** eBay categories to search for a fashion product: one per department (unisex searches women and men). */
export function ebayFashionCategories(p: NormalizedProduct): string[] {
  if (p.category === 'jewelry') return [JEWELRY_ROOT];
  const f = p.fashion;
  if (!f) return [EBAY_FASHION_ROOT];
  if (f.gender === 'kids') return [...((KIDS as Partial<Record<CategorySlug, readonly string[]>>)[f.kind ? FASHION_CATEGORY_OF[f.kind] : p.category] ?? [DEPARTMENT.kids])];
  const genders = f.gender === 'unisex' ? (['women', 'men'] as const) : [f.gender];
  const ids = genders.map((g) => (f.kind ? LEAF[f.kind][g === 'women' ? 0 : 1] : DEPARTMENT[g]));
  return [...new Set(ids)];
}

/** Reverse lookup for category suggestions: eBay category > our type and department. First entry wins. */
const BY_EBAY = new Map<string, { kind?: FashionKind; gender: FashionGender }>();
for (const [kind, [w, m]] of Object.entries(LEAF) as [FashionKind, readonly [string, string]][]) {
  // Dresses and skirts sit only in the women's tree.
  if (!BY_EBAY.has(w)) BY_EBAY.set(w, { kind, gender: 'women' });
  if (!BY_EBAY.has(m)) BY_EBAY.set(m, { kind, gender: 'men' });
}
// Jewellery leaves of the German tree (category suggestions use it): fine, fashion and men's jewellery.
for (const [ids, kind] of [[['261988', '261987', '261999'], 'bracelet'], [['261993', '155101', '137839'], 'necklace'], [['261994', '67681', '137856'], 'ring'], [['261990', '50647', '14085'], 'earrings']] as const) {
  for (const id of ids) BY_EBAY.set(id, { kind, gender: 'unisex' });
}
BY_EBAY.set('185098', { kind: 'activewear', gender: 'women' });
BY_EBAY.set('185099', { kind: 'activewear', gender: 'men' });
BY_EBAY.set('15724', { gender: 'women' });
BY_EBAY.set('1059', { gender: 'men' });
BY_EBAY.set(DEPARTMENT.women, { gender: 'women' });
BY_EBAY.set(DEPARTMENT.men, { gender: 'men' });
BY_EBAY.set(DEPARTMENT.kids, { gender: 'kids' });

/**
 * Our fashion attributes from an eBay category and its ancestors (closest first), e.g. a Taxonomy suggestion.
 * Undefined when the category is not under Clothes, Shoes & Accessories.
 */
export function fashionFromEbay(categoryIds: readonly string[]): { category: CategorySlug; fashion?: FashionAttributes } | undefined {
  // Jewellery (not watches, which have their own category).
  if (categoryIds.includes(JEWELRY_ROOT) && !categoryIds.includes('260324')) {
    const kind = categoryIds.map((id) => BY_EBAY.get(id)?.kind).find((k) => k !== undefined && FASHION_CATEGORY_OF[k] === 'jewelry');
    return { category: 'jewelry', fashion: { ...(kind && { kind }), gender: 'unisex' } };
  }
  if (!categoryIds.includes(EBAY_FASHION_ROOT)) return undefined;
  // Anything under the kids department is a kids item. Kids leaves carry no type, only the group.
  if (categoryIds.includes(DEPARTMENT.kids)) {
    const group = (Object.entries(KIDS) as [CategorySlug, readonly string[]][]).find(([, ids]) => ids.some((id) => categoryIds.includes(id)))?.[0];
    const kind: FashionKind | undefined = group === 'shoes' ? 'shoes' : group === 'bags' ? 'backpack' : undefined;
    return { category: group ?? 'clothing', fashion: { ...(kind && { kind }), gender: 'kids' } };
  }
  for (const id of categoryIds) {
    const hit = BY_EBAY.get(id);
    if (!hit) continue;
    // A leaf without a type (e.g. "Damenmode"): keep looking up for nothing better, but remember the department.
    if (!hit.kind) return { category: 'clothing', fashion: { gender: hit.gender } };
    return { category: FASHION_CATEGORY_OF[hit.kind], fashion: { kind: hit.kind, gender: hit.gender } };
  }
  return { category: 'clothing' };
}

/** Labels without a brand, as recognition or users write them. */
const NO_BRAND = new Set(['', 'unknown', 'unbranded', 'nobrand', 'none', 'generic', 'nameless', 'nobrandname', 'ohnemarke', 'sansmarque', 'senzamarca', 'sinmarca']);
export const isUnbranded = (brand: string): boolean => NO_BRAND.has(compact(brand));

const words = (list: readonly string[]): RegExp => new RegExp(`(?<![a-z0-9])(?:${list.join('|')})(?![a-z0-9])`);

/** Several items in one listing: the price is not one item's price. */
const FASHION_BUNDLE = new RegExp(
  [
    words(['bundle', 'konvolut', 'job lot', 'lot of', 'lot de', 'lote de', 'lotto', 'stock', 'paket', 'kleiderpaket', 'bekleidungspaket', 'pakket', 'set of', 'zestaw', 'mystery box']).source,
    String.raw`(?<![a-z0-9])\d{1,3}\s?(?:teile|tlg|stuck|stk|pcs|pieces|pezzi|pieces|piezas|prendas|stuks|capi|articles)(?![a-z])`,
  ].join('|'),
);

/** Fakes and copies are cheap and would drag the estimate down; we only price originals. */
const REPLICA = words(['replica', 'replika', 'fake', 'imitat', 'imitation', 'nachbildung', 'inspired', 'style of', 'look ?alike', 'dupe', 'copia', 'copie']);

/** "Pull&Bear" ~ "Pull & Bear" ~ "Pull and Bear" ~ "PULLANDBEAR"; "Levi's" ~ "Levis". Word-bounded so "H&M" is not any "hm". */
function brandRegex(brand: string): RegExp {
  const parts = normalizeText(brand)
    .split(/\s*(?:&|\+|\band\b|\bund\b|\bet\b|\by\b)\s*/)
    .map((x) => [...x.replace(/[^a-z0-9]/g, '')].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[\\s'’.-]?"))
    .filter(Boolean);
  return new RegExp(`(?<![a-z0-9])${parts.join(String.raw`\s*(?:&|\+|and|und|et|y)?\s*`)}(?![a-z0-9])`);
}

function looseRegex(text: string): RegExp {
  const chars = [...compact(text)].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![a-z0-9])${chars.join('[^a-z0-9]*')}(?![a-z0-9])`);
}

/** Jewellery type words in the six languages; a listing must name the type we price. */
const JEWELRY_WORDS: Readonly<Partial<Record<FashionKind, RegExp>>> = {
  necklace: words(['kette', 'halskette', 'collier', 'necklace', 'chain', 'pendant', 'anhanger', 'collana', 'ciondolo', 'collar', 'colgante', 'ketting', 'hanger']),
  bracelet: words(['armband', 'armreif', 'bracelet', 'bangle', 'bracciale', 'pulsera', 'brazalete', 'jonc']),
  ring: words(['ring', 'ringe', 'bague', 'anello', 'anillo']),
  earrings: words(['ohrringe?', 'ohrstecker', 'ohrhanger', 'creolen', 'earrings?', 'studs', 'boucles? d.oreilles?', 'orecchini', 'pendientes', 'aretes', 'oorbellen', 'oorknopjes']),
  charm: words(['charms?', 'bead', 'dije', 'ciondolo', 'breloque', 'bedel']),
};
const WATCH_WORDS = words(['uhr', 'armbanduhr', 'watch', 'montre', 'orologio', 'reloj', 'horloge']);

/** The jewellery type named in a typed item ("Thomas Sabo Charm"): more precise than eBay's merged categories. */
export function jewelryKindFromText(text: string): FashionKind | undefined {
  const t = normalizeText(text);
  // Charms first: "charm bracelet" listings are priced as the bracelet only when no charm word is there.
  for (const kind of ['charm', 'earrings', 'ring', 'necklace', 'bracelet'] as const) if (JEWELRY_WORDS[kind]!.test(t)) return kind;
  return undefined;
}

export function matchFashionTitle(product: NormalizedProduct, title: string): MatchResult {
  const t = normalizeText(title);
  if (FASHION_BUNDLE.test(t)) return { reason: 'bundle', similarity: 0 };
  if (REPLICA.test(t)) return { reason: 'wrong_variant', similarity: 0, detail: 'replica' };
  if (product.category === 'jewelry') {
    if (WATCH_WORDS.test(t)) return { reason: 'wrong_variant', similarity: 0, detail: 'watch' };
    const kind = product.fashion?.kind;
    const re = kind ? JEWELRY_WORDS[kind] : undefined;
    if (re && !re.test(t)) return { reason: 'wrong_variant', similarity: 0, detail: `not a ${kind}` };
  }
  if (compact(product.brand).length >= 2 && !brandRegex(product.brand).test(t)) return { reason: 'model_not_found', similarity: 0, detail: 'brand' };
  const style = product.fashion?.style;
  if (style && compact(style).length > 0 && !looseRegex(style).test(t)) return { reason: 'model_not_found', similarity: 0, detail: 'style' };
  // Without a named style, listings of the same brand and type vary more: mark them as less similar.
  return { similarity: style ? 1 : 0.8 };
}
