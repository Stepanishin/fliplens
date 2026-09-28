import type { CategorySlug, Condition } from '@fliplens/core';
import type { IdentificationCandidate } from '@fliplens/recognition';
import type { BarcodeResult, IdentificationResult, ServerScan, ValuationRequest } from './api.js';
import type { Settings } from './storage.js';

/** Everything the scan flow collects between "Scan" and "Result". */

export const CAPACITY_CATEGORIES: readonly CategorySlug[] = ['smartphones', 'tablets', 'laptops', 'consoles', 'handhelds'];
export const MOUNT_CATEGORIES: readonly CategorySlug[] = ['lenses', 'camera_bodies'];

export type Identification = IdentificationResult & Partial<Pick<BarcodeResult, 'gtin' | 'listingCount'>>;

export interface ProductDraft {
  category: CategorySlug;
  brand: string;
  model: string;
  capacity: string;
  mount: string;
  /** Comma separated. */
  excludeModels: string;
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

export const EMPTY_PRODUCT: ProductDraft = { category: 'headphones', brand: '', model: '', capacity: '', mount: '', excludeModels: '' };

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
      brand: c.brand,
      model: c.model,
      capacity: c.capacity ?? '',
      mount: c.mount ?? '',
      excludeModels: r.confusableModels.join(', '),
    },
    condition: r.conditionGuess ?? d.condition,
  };
}

export const parsePrice = (s: string): number => Number(s.replace(',', '.').replace(/[^\d.]/g, ''));
export const hasIdentity = (p: ProductDraft): boolean => p.brand.trim().length > 0 && p.model.trim().length > 0;

export function buildRequest(d: Draft, s: Settings): ValuationRequest {
  const p = d.product;
  const exclude = p.excludeModels.split(',').map((x) => x.trim()).filter(Boolean);
  const r = d.identification;
  const chosen = d.chosenIndex !== null ? r?.candidates[d.chosenIndex] : undefined;
  return {
    product: {
      category: p.category,
      brand: p.brand.trim(),
      model: p.model.trim(),
      ...(p.capacity.trim() && CAPACITY_CATEGORIES.includes(p.category) && { capacity: p.capacity.trim() }),
      ...(p.mount.trim() && MOUNT_CATEGORIES.includes(p.category) && { mount: p.mount.trim() }),
      ...(exclude.length > 0 && { excludeModels: exclude }),
    },
    condition: d.condition,
    purchasePrice: parsePrice(d.price),
    currency: 'EUR',
    preset: s.preset,
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
      brand: s.product.brand,
      model: s.product.model,
      capacity: s.product.capacity ?? '',
      mount: s.product.mount ?? '',
      excludeModels: s.excludeModels.join(', '),
    },
    condition: s.condition,
    price: String(s.purchasePrice.amountMinor / 100),
  };
}
