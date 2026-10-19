import { useEffect, useState } from 'react';
import { isFashion, isUnbranded } from '@fliplens/core';
import { api, ApiError, type PhotoListing, type ValuationResponse } from './api.js';
import { applyCandidate, buildRequest, listingHints, newDraft, type Draft } from './flow.js';
import { errorText } from './i18n.js';
import type { Settings } from './storage.js';
import { track } from './track.js';
import { defaultListingLanguage } from './ui/ListingSheet.js';

/**
 * Many items at once (ADR-030): one photo per item, each recognised and valued like a normal check (one check per
 * item), then a listing for each on request. The queue lives here, outside React, so it keeps running while the user
 * opens one item's details and comes back.
 */

export type BatchStatus = 'queued' | 'identifying' | 'valuing' | 'done' | 'needs_brand' | 'not_found' | 'failed' | 'no_checks';

export interface BatchItem {
  id: string;
  photo: string;
  status: BatchStatus;
  draft?: Draft;
  resp?: ValuationResponse;
  error?: string | undefined;
  listing?: PhotoListing;
  listingBusy?: boolean;
  listingError?: string | undefined;
}

export const MAX_BATCH = 20;
const PARALLEL = 2;

let items: BatchItem[] = [];
const listeners = new Set<() => void>();
const set = (fn: (xs: BatchItem[]) => BatchItem[]) => {
  items = fn(items);
  listeners.forEach((l) => l());
};
const patch = (id: string, p: Partial<BatchItem>) => set((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

export function useBatch(): BatchItem[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return items;
}

let seq = 0;
export function addPhotos(photos: readonly string[]): void {
  set((xs) => [...xs, ...photos.slice(0, MAX_BATCH - xs.length).map((photo) => ({ id: `b${++seq}`, photo, status: 'queued' as const }))]);
}
export const removeItem = (id: string) => set((xs) => xs.filter((x) => x.id !== id));
export const clearBatch = () => set(() => []);

/** The user typed the brand the photo did not show: value it now. */
export function setBrand(id: string, brand: string, settings: Settings): void {
  const it = items.find((x) => x.id === id);
  if (!it?.draft || !brand.trim()) return;
  patch(id, { draft: { ...it.draft, edited: true, product: { ...it.draft.product, brand: brand.trim() } }, status: 'queued' });
  run(settings);
}

let running = 0;
let stopped = false;

/** Start (or continue) the queue: up to two items at a time. */
export function run(settings: Settings): void {
  stopped = false;
  while (running < PARALLEL) {
    const next = items.find((x) => x.status === 'queued');
    if (!next) return;
    running++;
    // Mark it before awaiting anything, so the next loop turn does not pick it again.
    patch(next.id, { status: next.draft ? 'valuing' : 'identifying', error: undefined });
    void processOne(next.id, settings).finally(() => {
      running--;
      if (!stopped) run(settings);
    });
  }
}

/** Out of checks or recognitions: everything still waiting stops with the reason. */
function stopAll(reason: string): void {
  stopped = true;
  set((xs) => xs.map((x) => (x.status === 'queued' ? { ...x, status: 'no_checks', error: reason } : x)));
}

async function processOne(id: string, settings: Settings): Promise<void> {
  let it = items.find((x) => x.id === id);
  if (!it) return;
  try {
    if (!it.draft) {
      const r = await api.identify([it.photo]);
      const top = r.candidates[0];
      if (!top || top.confidence < 0.5) {
        patch(id, { status: 'not_found' });
        return;
      }
      const draft = applyCandidate({ ...newDraft('photo'), photos: [it.photo], identification: r }, top, 0, r);
      patch(id, { draft });
      it = items.find((x) => x.id === id)!;
      // Clothes are priced by brand: without one, ask instead of spending a check on nothing.
      if (isFashion(top.category) && isUnbranded(top.brand)) {
        patch(id, { status: 'needs_brand' });
        return;
      }
      patch(id, { status: 'valuing' });
    }
    const resp = await api.valuation(buildRequest(it.draft!, settings));
    patch(id, { status: 'done', resp });
    track('batch_item_valued', { category: resp.category, status: resp.result.status });
  } catch (e) {
    const code = e instanceof ApiError ? e.code : undefined;
    if (code === 'quota_exceeded' || code === 'identify_limit' || code === 'trial_used' || code === 'ai_budget') {
      patch(id, { status: 'no_checks', error: errorText(e) });
      stopAll(errorText(e));
      return;
    }
    if (code === 'brand_required') {
      patch(id, { status: 'needs_brand' });
      return;
    }
    patch(id, { status: 'failed', error: errorText(e) });
  }
}

/** Write the listing for one checked item, with its brand, size, condition and the suggested price. */
export async function writeListing(id: string, settings: Settings): Promise<void> {
  const it = items.find((x) => x.id === id);
  if (!it?.draft || it.listingBusy) return;
  patch(id, { listingBusy: true, listingError: undefined });
  const hints = it.resp ? listingHints(it.draft, it.resp) : {};
  const conditions = ['new with tags', 'new without tags', 'very good', 'good', 'satisfactory'];
  const fashion = it.draft.product.category !== '' && isFashion(it.draft.product.category);
  try {
    const listing = await api.photoListing({
      images: [it.photo],
      marketplace: fashion || !settings.preset.startsWith('ebay') ? 'vinted' : 'ebay',
      language: defaultListingLanguage(settings.country),
      ...(hints.conditionIndex !== undefined && { condition: conditions[hints.conditionIndex]! }),
      ...(hints.notes && { notes: hints.notes }),
    });
    patch(id, { listing, listingBusy: false });
  } catch (e) {
    patch(id, { listingBusy: false, listingError: errorText(e) });
    throw e;
  }
}

/** Listings for every checked item without one, one after another; stops at the plan's listing limit. */
export async function writeAllListings(settings: Settings): Promise<void> {
  track('batch_listings_all', { n: items.filter((x) => x.status === 'done' && !x.listing).length });
  for (const it of items.filter((x) => x.status === 'done' && !x.listing)) {
    try {
      await writeListing(it.id, settings);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'upgrade_required' || e.code === 'listing_limit')) return;
    }
  }
}
