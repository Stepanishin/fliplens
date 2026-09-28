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
  feePreset: {
    id: FeePresetId;
    label: string;
    profileId: string;
    percentageFeeBp: number;
    fixedFeeMinor: number;
    sellerPaysShipping: boolean;
    sourceQuality: 'official' | 'secondary';
    lastVerifiedAt: string;
  };
  result: ValuationJson | InsufficientJson;
}

export interface Health {
  ok: boolean;
  pricingAlgorithmVersion: string;
  sources: { ebay: boolean };
  vision: { configured: boolean; provider: string };
  db: 'connected' | 'disabled' | 'error';
  auth: { google: string | null };
}

export interface Account {
  email: string | null;
  name: string | null;
  picture: string | null;
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

export interface ServerSettings {
  country: string;
  currency: string;
  feePreset: string;
  shippingCostMinor: number;
  targetRoiPct: number;
}

export interface MarketActivityJson {
  kind: 'active_listings';
  activeListings: number;
  countries: number;
  medianListingAgeDays: number | null;
  staleShare: number | null;
}

/** Stored valuation row (aggregates only, see ADR-009). */
export interface StoredValuation {
  status: 'ok' | 'insufficient_data';
  insufficientReason: string | null;
  dataKind: 'sold' | 'asking' | null;
  currency: string;
  fastSaleMinor: number | null;
  expectedSaleMinor: number | null;
  highSaleMinor: number | null;
  estimatedFeesMinor: number | null;
  estimatedShippingMinor: number | null;
  expectedNetMinor: number | null;
  expectedProfitMinor: number | null;
  roiBp: number | null;
  maxBuyMinor: number | null;
  confidenceScore: number | null;
  confidenceLevel: 'high' | 'medium' | 'low' | null;
  decision: 'strong_buy' | 'buy' | 'borderline' | 'skip' | null;
  decisionFactors: string[] | null;
  risks: string[] | null;
  includedCount: number;
  fetchedCount: number;
  exclusionCounts: Record<string, number>;
  market: MarketActivityJson | null;
  sites: Record<string, number> | null;
  feeProfileId: string;
  pricingAlgorithmVersion: string;
  dataFetchedAt: string | null;
  createdAt: string;
}

export interface BillingInfo {
  enabled: boolean;
  quota: { plan: 'free' | 'pro' | 'reseller'; used: number; limit: number; remaining: number };
  subscription: { plan: 'pro' | 'reseller'; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  plans: { id: 'free' | 'pro' | 'reseller'; name: string; priceMonthlyMinor: number; monthlyValuations: number; features: string[] }[];
}

export class ApiError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
  }
}

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
    if (res.status === 401 && b?.error === 'sign_in_required') window.dispatchEvent(new Event('fliplens:signed-out'));
    throw new ApiError(b?.message ?? b?.error ?? `HTTP ${res.status}`, b?.error, res.status);
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
  billing: () => call<BillingInfo>('/api/billing'),
  checkout: (plan: 'pro' | 'reseller') =>
    call<{ url: string }>('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) }),
  portal: () => call<{ url: string }>('/api/billing/portal', { method: 'POST' }),
  me: () => call<{ account: Account | null; authAvailable: boolean }>('/api/me'),
  googleLogin: (credential: string) =>
    call<{ account: Account }>('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) }),
  logout: () => call<{ signedOut: boolean }>('/api/auth/logout', { method: 'POST' }),
  scans: () => call<ServerScan[]>('/api/scans'),
  scan: (id: string) => call<{ scan: { id: string; createdAt: string }; valuation: StoredValuation | null }>(`/api/scans/${id}`),
  settings: () => call<ServerSettings | null>('/api/me/settings'),
  saveSettings: (s: ServerSettings) =>
    call<ServerSettings>('/api/me/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }),
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
