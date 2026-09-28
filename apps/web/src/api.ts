import type {
  CategorySlug,
  Condition,
  CurrencyCode,
  EvaluatedComparable,
  FeePresetId,
  InsufficientData,
  Valuation,
} from '@fliplens/core';
import type { IdentificationResult as BaseIdentification } from '@fliplens/recognition';
import { deviceId } from './storage.js';

/** JSON turns Dates into strings; the UI only displays them. */
type Jsonify<T> = T extends Date
  ? string
  : T extends readonly (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

export type ValuationJson = Jsonify<Valuation>;
export type InsufficientJson = Jsonify<InsufficientData>;
export type ComparableJson = Jsonify<EvaluatedComparable>;
/** API adds the stored identification id (absent when the server has no database). */
export type IdentificationResult = BaseIdentification & { identificationId?: string };

export interface ValuationRequest {
  product: {
    category: CategorySlug;
    brand: string;
    model: string;
    capacity?: string;
    mount?: string;
    gtin?: string;
    excludeModels?: string[];
  };
  condition: Condition;
  purchasePrice: number;
  currency: CurrencyCode;
  preset: FeePresetId;
  shippingCost: number;
  targetRoiPct?: number;
  identificationConfidence?: number;
  recognitionModelVersion?: string;
  inputMethod?: 'photo' | 'barcode' | 'manual';
  identificationId?: string;
  chosenCandidateIndex?: number;
  gtin?: string;
}

export interface ValuationResponse {
  scanId?: string;
  source: 'ebay';
  dataFetchedAt: string | null;
  sourceWarnings: { source: string; site?: string; message: string }[];
  fx: { rateDate: string; source: string };
  feePreset: { id: FeePresetId; verified: boolean };
  result: ValuationJson | InsufficientJson;
}

export interface Health {
  ok: boolean;
  pricingAlgorithmVersion: string;
  sources: { ebay: boolean };
  vision: { configured: boolean; provider: string };
  db: 'connected' | 'disabled' | 'error';
}

export interface ServerScan {
  id: string;
  createdAt: string;
  inputMethod: 'photo' | 'barcode' | 'manual';
  product: { category: CategorySlug; brand: string; model: string; capacity: string | null; mount: string | null };
  excludeModels: string[];
  condition: Condition;
  purchasePrice: { amountMinor: number; currency: CurrencyCode };
  status: 'valued' | 'insufficient_data';
  valuation: { expected: number | null; profit: number | null; roiPct: number | null; decision: string | null; confidenceLevel: string | null; includedCount: number } | null;
}

export class ApiError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set('x-device-id', deviceId());
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError('API unreachable. Is `pnpm dev` running?');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const b = body as { message?: string; error?: string } | null;
    throw new ApiError(b?.message ?? b?.error ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export interface BenchmarkAddRequest {
  images: string[];
  category: CategorySlug;
  truth: { brand: string; model: string; capacity?: string; mount?: string; variant?: string };
  condition: Condition;
  purchasePriceEur: number;
  marketRange: { low: number; high: number; kind: 'sold' | 'asking' | 'mixed' };
  photoContext?: 'in_hand_shop_light' | 'on_table' | 'boxed' | 'label_visible' | 'poor_light';
  referenceUrls?: string[];
  notes?: string;
}

export type BarcodeResult = IdentificationResult & { gtin: string; listingCount: number; sites: Record<string, number> };

export const api = {
  benchmarkCount: () => call<{ count: number; byPrefix: Record<string, number> }>('/api/benchmark/items'),
  benchmarkAdd: (req: BenchmarkAddRequest) =>
    call<{ id: string; count: number }>('/api/benchmark/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),
  health: () => call<Health>('/api/health'),
  scans: () => call<ServerScan[]>('/api/scans'),
  deleteScan: (id: string) => call<{ deleted: boolean }>(`/api/scans/${id}`, { method: 'DELETE' }),
  exportMyData: () => call<unknown>('/api/me/export'),
  deleteMyData: () => call<{ deleted: boolean }>('/api/me', { method: 'DELETE' }),
  identify: (images: string[]) =>
    call<IdentificationResult>('/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    }),
  identifyBarcode: (gtin: string) =>
    call<BarcodeResult>('/api/identify/barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gtin }),
    }),
  valuation: (req: ValuationRequest) =>
    call<ValuationResponse>('/api/valuation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),
};
