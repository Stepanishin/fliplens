import { isFashion, marketFor, type CategorySlug, type Condition, type FashionAttributes, type FashionGender, type FashionKind, type FeePresetId } from '@fliplens/core';
import type { IdentificationCandidate } from '@fliplens/recognition';
import type { BarcodeResult, IdentificationResult, ServerScan, ValuationRequest } from './api.js';
import { loadClothesOnVinted, type Settings } from './storage.js';

/** Everything the scan flow collects between "Scan" and "Result". */

export const CAPACITY_CATEGORIES: readonly CategorySlug[] = ['smartphones', 'tablets', 'laptops', 'consoles', 'handhelds'];

/** Typical storage sizes per category, offered as one-tap choices (anything else via "Other"). */
export const CAPACITY_OPTIONS: Partial<Record<CategorySlug, readonly string[]>> = {
  smartphones: ['64GB', '128GB', '256GB', '512GB', '1TB'],
  tablets: ['64GB', '128GB', '256GB', '512GB', '1TB'],
  laptops: ['256GB', '512GB', '1TB', '2TB'],
  consoles: ['500GB', '825GB', '1TB', '2TB'],
  handhelds: ['64GB', '256GB', '512GB', '1TB'],
};
export const MOUNT_CATEGORIES: readonly CategorySlug[] = ['lenses', 'camera_bodies'];

export type Identification = IdentificationResult & Partial<Pick<BarcodeResult, 'gtin' | 'listingCount'>>;

export interface ProductDraft {
  /** '' = not known yet (auto-detect from brand + model). */
  category: CategorySlug | '';
  /** category was filled in by auto-detect, not chosen by the user: re-detect when brand/model change. */
  categoryAuto: boolean;
  brand: string;
  model: string;
  capacity: string;
  mount: string;
  /** Comma separated. */
  excludeModels: string;
  /** Clothes, shoes, bags: '' = not known (the server detects it from brand + model). */
  fashionKind: FashionKind | '';
  gender: FashionGender | '';
  /** Named style or line ("Air Force 1", "501"); empty = priced by brand and type only. */
  style: string;
}

export interface Draft {
  method: 'photo' | 'barcode' | 'manual';
  photos: string[];
  identification: Identification | null;
  chosenIndex: number | null;
  /** The user changed the recognised identity: they confirmed it themselves (logged as a correction). */
  edited: boolean;
  product: ProductDraft;
  condition: Condition;
  price: string;
}

export const EMPTY_PRODUCT: ProductDraft = { category: '', categoryAuto: false, brand: '', model: '', capacity: '', mount: '', excludeModels: '', fashionKind: '', gender: '', style: '' };

/** Draft fields for a product's fashion attributes (empty when there are none). */
export function fashionFields(f: FashionAttributes | undefined): Pick<ProductDraft, 'fashionKind' | 'gender' | 'style'> {
  return { fashionKind: f?.kind ?? '', gender: f?.gender ?? '', style: f?.style ?? '' };
}

export const showsFashion = (c: ProductDraft['category']): boolean => c !== '' && isFashion(c);

/**
 * Where an item is valued. Clothes go to Vinted by default (most are sold there), with the user's eBay preset as the
 * side-by-side alternative, or the other way round. Only when both read the same market data (same eBay sites).
 */
export function presetsFor(category: ProductDraft['category'], s: Settings): { preset: FeePresetId; altPreset?: FeePresetId } {
  if (!showsFashion(category) || s.preset === 'vinted') return { preset: s.preset };
  const a = marketFor(s.country, s.preset);
  const v = marketFor(s.country, 'vinted');
  if (a.currency !== v.currency || String(a.sites) !== String(v.sites)) return { preset: s.preset };
  return loadClothesOnVinted() ? { preset: 'vinted', altPreset: s.preset } : { preset: s.preset, altPreset: 'vinted' };
}

export function newDraft(method: Draft['method']): Draft {
  return { method, photos: [], identification: null, chosenIndex: null, edited: false, product: { ...EMPTY_PRODUCT }, condition: 'good', price: '' };
}

export function applyCandidate(d: Draft, c: IdentificationCandidate, index: number, r: Identification): Draft {
  return {
    ...d,
    chosenIndex: index,
    edited: false,
    product: {
      category: c.category,
      categoryAuto: false,
      brand: c.brand,
      model: c.model,
      // '128 GB' -> '128GB', so it matches the storage chips.
      capacity: (c.capacity ?? '').toUpperCase().replace(/\s+/g, ''),
      mount: c.mount ?? '',
      excludeModels: isFashion(c.category) ? '' : r.confusableModels.join(', '),
      ...fashionFields(c.fashion),
    },
    condition: r.conditionGuess ?? d.condition,
  };
}

/** Storage only matters for phones, tablets, laptops and consoles. */
export const showsCapacity = (c: ProductDraft['category']): boolean => c !== '' && CAPACITY_CATEGORIES.includes(c);

export const parsePrice = (s: string): number => Number(s.replace(',', '.').replace(/[^\d.]/g, ''));
export const hasIdentity = (p: ProductDraft): boolean => p.brand.trim().length > 0 && p.model.trim().length > 0;

export function buildRequest(d: Draft, s: Settings): ValuationRequest {
  const p = d.product;
  const exclude = p.excludeModels.split(',').map((x) => x.trim()).filter(Boolean);
  const r = d.identification;
  const chosen = d.chosenIndex !== null ? r?.candidates[d.chosenIndex] : undefined;
  return {
    product: {
      ...(p.category && { category: p.category }),
      brand: p.brand.trim(),
      model: p.model.trim(),
      ...(p.capacity.trim() && showsCapacity(p.category) && { capacity: p.capacity.trim() }),
      ...(p.mount.trim() && p.category && MOUNT_CATEGORIES.includes(p.category) && { mount: p.mount.trim() }),
      ...(exclude.length > 0 && !showsFashion(p.category) && { excludeModels: exclude }),
      // Without a department the server detects type and department from brand + model.
      ...(showsFashion(p.category) && p.gender && {
        fashion: { ...(p.fashionKind && { kind: p.fashionKind }), gender: p.gender, ...(p.style.trim() && { style: p.style.trim() }) },
      }),
    },
    condition: d.condition,
    // Empty price: "what is it worth, how much may I pay".
    ...(d.price.trim() !== '' && { purchasePrice: parsePrice(d.price) }),
    currency: marketFor(s.country, s.preset).currency,
    country: s.country,
    ...presetsFor(p.category, s),
    shippingCost: s.shippingCost,
    targetRoiPct: s.targetRoiPct,
    inputMethod: d.method,
    ...(r && {
      recognitionModelVersion: r.modelVersion,
      identificationConfidence: d.edited || !chosen ? 1 : chosen.confidence,
      ...(d.chosenIndex !== null && { chosenCandidateIndex: d.chosenIndex }),
      ...(r.identificationId && { identificationId: r.identificationId }),
      ...(r.gtin && { gtin: r.gtin }),
    }),
  };
}

/** Re-check a saved scan against today's market. */
export function draftFromScan(s: ServerScan): Draft {
  return {
    ...newDraft('manual'),
    product: {
      category: s.product.category,
      categoryAuto: false,
      brand: s.product.brand,
      model: s.product.model,
      capacity: s.product.capacity ?? '',
      mount: s.product.mount ?? '',
      excludeModels: s.excludeModels.join(', '),
      ...fashionFields(s.product.fashion),
    },
    condition: s.condition,
    price: s.priceProvided === false ? '' : String(s.purchasePrice.amountMinor / 100),
  };
}

const VINTED_CONDITION_INDEX: Partial<Record<Condition, number>> = { new: 0, like_new: 1, very_good: 2, good: 3, fair: 4, poor: 4 };

/**
 * What a listing written after a check should know: brand, item, size (read from the label) and the price the check
 * suggests. Plain facts in English; the listing writer turns them into the chosen language.
 */
export function listingHints(d: Draft, resp: { result: { status: string; estimate?: { expected: { amountMinor: number; currency: string } } } }): { notes?: string; conditionIndex?: number } {
  const p = d.product;
  const chosen = d.chosenIndex !== null ? d.identification?.candidates[d.chosenIndex] : undefined;
  const size = showsFashion(p.category) && !d.edited ? chosen?.variant : undefined;
  const price = resp.result.status === 'ok' ? resp.result.estimate?.expected : undefined;
  const facts = [
    p.brand.trim() && `Brand: ${p.brand.trim()}`,
    p.model.trim() && `Item: ${p.model.trim()}${p.style.trim() ? ` (${p.style.trim()})` : ''}`,
    size && `Size: ${size}`,
    price && `Price: ${Math.round(price.amountMinor / 100)} ${price.currency}`,
  ].filter(Boolean);
  const conditionIndex = VINTED_CONDITION_INDEX[d.condition];
  return { ...(facts.length > 0 && { notes: facts.join('. ') }), ...(conditionIndex !== undefined && { conditionIndex }) };
}
