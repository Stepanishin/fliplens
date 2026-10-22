import { isFashion, marketFor, type FeePresetId } from '@fliplens/core';
import type { IdentificationCandidate, IdentificationResult } from '@fliplens/recognition';
import { APP_URL, MARKETPLACES, type CheckResult, type ListingData, type Reply, type Request, type Session, type Status, type ValuationResponse } from './shared.js';

/**
 * Service worker: the only part that talks to the FlipLens API. It runs with host permission for APP_URL, so there is
 * no CORS, and it signs requests with the web app's device key (copied by app-session.ts; ADR-032).
 */

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

async function session(): Promise<Session | undefined> {
  const { session } = await chrome.storage.local.get('session');
  return session as Session | undefined;
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const s = await session();
  if (!s) throw new ApiError(401, 'not_connected');
  const res = await fetch(`${APP_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': s.deviceId },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? `http_${res.status}`, json.message);
  return json as T;
}

/** Clothes are valued for Vinted next to the user's platform, like the web app does (apps/web/src/flow.ts presetsFor). */
function presetsFor(c: IdentificationCandidate, s: Session): { preset: FeePresetId; altPreset?: FeePresetId } {
  const preset = s.settings.preset;
  if (!isFashion(c.category) || preset === 'vinted') return { preset };
  const a = marketFor(s.settings.country, preset);
  const v = marketFor(s.settings.country, 'vinted');
  if (a.currency !== v.currency || String(a.sites) !== String(v.sites)) return { preset };
  return s.clothesOnVinted ? { preset: 'vinted', altPreset: preset } : { preset, altPreset: 'vinted' };
}

async function check(listing: ListingData, price: number): Promise<CheckResult | { notIdentified: true }> {
  const s = (await session())!;
  const id = await call<IdentificationResult & { identificationId?: string }>('/api/identify/listing', {
    marketplace: listing.marketplace,
    title: listing.title,
    ...(listing.description && { description: listing.description }),
    ...(listing.attributes.length > 0 && { attributes: listing.attributes }),
    ...(listing.imageUrl && { imageUrl: listing.imageUrl }),
  });
  const top = id.candidates[0];
  if (!top) return { notIdentified: true };
  const condition = id.conditionGuess ?? 'good';
  const valuation = await call<ValuationResponse>('/api/valuation', {
    product: {
      category: top.category,
      brand: top.brand,
      model: top.model,
      ...(top.capacity && { capacity: top.capacity }),
      ...(top.mount && { mount: top.mount }),
      // Books, music, films: the exact edition by its barcode when the listing names it.
      ...(top.gtin && ['books', 'vinyl', 'cds', 'movies'].includes(top.category) && { gtin: top.gtin }),
      ...(top.fashion && { fashion: top.fashion }),
    },
    condition,
    purchasePrice: price,
    currency: marketFor(s.settings.country, s.settings.preset).currency,
    country: s.settings.country,
    ...presetsFor(top, s),
    shippingCost: s.settings.shippingCost,
    targetRoiPct: s.settings.targetRoiPct,
    inputMethod: 'listing',
    identificationConfidence: top.confidence,
    recognitionModelVersion: id.modelVersion,
    chosenCandidateIndex: 0,
    ...(id.identificationId && { identificationId: id.identificationId }),
  });
  const name = `${top.brand} ${top.fashion?.style ?? top.model}`.trim();
  return { product: { name, category: valuation.category, confidence: top.confidence }, condition, purchasePrice: price, valuation };
}

async function status(): Promise<Status> {
  if (!(await session())) return { connected: false, account: null, quota: null };
  const me = await call<{ account: Status['account'] }>('/api/me');
  const billing = me.account ? await call<{ quota: Status['quota'] }>('/api/billing').catch(() => null) : null;
  return { connected: true, account: me.account, quota: billing?.quota ?? null };
}

async function handle(req: Request, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (req.type) {
    case 'session':
      // Only the FlipLens page itself may hand over its device key.
      if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(`${APP_URL}/`)) throw new ApiError(403, 'forbidden');
      await chrome.storage.local.set({ session: req.session });
      return null;
    case 'check':
      return check(req.listing, req.price);
    case 'bought':
      return call('/api/inventory', {
        scanId: req.scanId,
        purchasePrice: req.price,
        source: MARKETPLACES[req.listing.marketplace],
        notes: req.listing.url,
      });
    case 'status':
      return status();
  }
}

chrome.runtime.onMessage.addListener((req: Request, sender, sendResponse: (r: Reply<unknown>) => void) => {
  handle(req, sender).then(
    (data) => sendResponse({ ok: true, data }),
    (e: unknown) =>
      sendResponse(
        e instanceof ApiError
          ? { ok: false, error: e.code, message: e.message, status: e.status }
          : { ok: false, error: 'network', message: e instanceof Error ? e.message : String(e) },
      ),
  );
  return true;
});
