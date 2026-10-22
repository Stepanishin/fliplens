import { APP_URL, formatMoney, send, t, type CheckResult, type ListingData, type Reply, type Session, type StringKey, type Verdict } from './shared.js';
import { marketFor } from '@fliplens/core';
import { adapterFor, parsePrice } from './sites.js';

/**
 * Content script on the marketplaces in sites.ts. On a listing page it shows a small FlipLens panel: the price the user
 * would pay (prefilled from the page) and a button that checks the deal. Nothing is sent before the click, because
 * each check uses one recognition and one check of the user's plan (ADR-032).
 */

const adapter = adapterFor(location.hostname);

/** Vinted buyer protection: EUR 0.70 + 5% of the item price, paid on top (matches the "inkl. Vinted-Gebühr" total, 2026-10-21). */
const vintedTotal = (price: number): number => Math.round((price + 0.7 + price * 0.05) * 100) / 100;

// ---------- results cache (no second check for a listing seen today) ----------

const CACHE_KEY = 'results';
const CACHE_HOURS = 24;
type Cached = { at: number; result: CheckResult };

async function cached(url: string): Promise<CheckResult | undefined> {
  const { [CACHE_KEY]: all = {} } = (await chrome.storage.local.get(CACHE_KEY)) as { results?: Record<string, Cached> };
  const hit = all[url];
  return hit && Date.now() - hit.at < CACHE_HOURS * 3_600_000 ? hit.result : undefined;
}

async function remember(url: string, result: CheckResult): Promise<void> {
  const { [CACHE_KEY]: all = {} } = (await chrome.storage.local.get(CACHE_KEY)) as { results?: Record<string, Cached> };
  const fresh = Object.entries(all).filter(([, c]) => Date.now() - c.at < CACHE_HOURS * 3_600_000).slice(-199);
  await chrome.storage.local.set({ [CACHE_KEY]: Object.fromEntries([...fresh, [url, { at: Date.now(), result }]]) });
}

// ---------- panel ----------

const STYLE = `
:host { all: initial; }
.panel { --bg: #fff; --fg: #111827; --muted: #6b7280; --line: #e5e7eb; --accent: #0d9488; --accent-2: #0f766e;
  --strong_buy: #16a34a; --buy: #4d9f24; --borderline: #d08a0b; --skip: #e0472f;
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 300px; max-width: calc(100vw - 32px);
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg);
  border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.18); overflow: hidden; }
@media (prefers-color-scheme: dark) {
  .panel { --bg: #15181d; --fg: #f3f4f6; --muted: #9ca3af; --line: #2a2f37; --accent: #2dd4bf; --accent-2: #14b8a6;
    --strong_buy: #22c55e; --buy: #84cc16; --borderline: #f5a524; --skip: #fb7163; }
}
.head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; user-select: none; }
.head b { flex: 1; font-size: 14px; }
.logo { width: 20px; height: 20px; border-radius: 5px; background: var(--accent-2); display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 12px; }
.chev { color: var(--muted); font-size: 12px; }
.body { padding: 0 12px 12px; display: grid; gap: 10px; }
.collapsed .body { display: none; }
label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }
.price { display: flex; align-items: center; gap: 6px; }
input { flex: 1; min-width: 0; font: inherit; color: var(--fg); background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; }
.cur { color: var(--muted); }
button, a.btn { font: inherit; font-weight: 600; border: 0; border-radius: 9px; padding: 9px 12px; cursor: pointer; text-align: center; text-decoration: none; }
.primary { background: var(--accent-2); color: #fff; }
.secondary { background: transparent; color: var(--fg); border: 1px solid var(--line); }
button:disabled { opacity: .6; cursor: default; }
.row { display: flex; gap: 8px; } .row > * { flex: 1; }
.verdict { color: #fff; font-weight: 800; letter-spacing: .03em; border-radius: 9px; padding: 8px 10px; text-align: center; }
.product { font-weight: 600; } .muted { color: var(--muted); font-size: 12px; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0; }
dt { color: var(--muted); } dd { margin: 0; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.pos { color: var(--strong_buy); } .neg { color: var(--skip); }
.note { font-size: 13px; padding: 8px 10px; border-radius: 9px; background: rgba(127,127,127,.12); }
.spin { width: 14px; height: 14px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: s 0.8s linear infinite; display: inline-block; vertical-align: -2px; margin-right: 6px; }
@keyframes s { to { transform: rotate(360deg); } }
`;

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type State =
  | { kind: 'idle'; listing: ListingData; price?: string; error?: string; action?: 'signIn' | 'upgrade' }
  | { kind: 'loading'; listing: ListingData; price: string }
  | { kind: 'result'; listing: ListingData; result: CheckResult; bought?: boolean };

let host: HTMLElement | undefined;
let root: ShadowRoot;
let state: State | undefined;
let collapsed = false;
/** Checks are valued in the user's market currency (pounds for the UK, else euros). */
let marketCurrency: 'EUR' | 'GBP' = 'EUR';

function mount(): void {
  if (host?.isConnected) return;
  host = document.createElement('fliplens-panel');
  // Shadow DOM keeps the page's styles out of the panel and ours out of the page.
  root = host.attachShadow({ mode: 'open' });
  root.addEventListener('click', (e) => void onClick(e));
  document.documentElement.append(host);
}

function unmount(): void {
  host?.remove();
  host = undefined;
  state = undefined;
}

function verdictBlock(v: Verdict, label: string, main: boolean): string {
  if (v.status !== 'ok') {
    return main ? `<div class="note">${esc(t(v.reason === 'low_identification_confidence' ? 'lowConfidence' : 'fewComparables'))}</div>` : '';
  }
  const p = v.profit.expected;
  const roi = p.roiPct === null ? '' : ` · ${Math.round(p.roiPct)}%`;
  const rows = `
    <dt>${esc(t('expected'))}</dt><dd>${esc(formatMoney(v.estimate.expected))}</dd>
    <dt>${esc(t('profit'))}</dt><dd class="${p.profit.amountMinor >= 0 ? 'pos' : 'neg'}">${esc(formatMoney(p.profit))}${roi}</dd>
    ${v.maxBuyPrice ? `<dt>${esc(t('maxBuy'))}</dt><dd>${esc(formatMoney(v.maxBuyPrice))}</dd>` : ''}`;
  if (!main) return `<div class="muted">${esc(t('on'))} ${esc(label)}</div><dl>${rows}</dl>`;
  return `
    <div class="verdict" style="background: var(--${v.decision.decision})">${esc(t(v.decision.decision as StringKey))}</div>
    <div class="muted">${esc(t('on'))} ${esc(label)} · ${v.estimate.distribution.count} ${esc(t('listings'))}</div>
    <dl>${rows}</dl>`;
}

function render(): void {
  if (!state) return;
  const s = state;
  const listing = s.listing;
  let body = '';
  if (s.kind === 'idle' || s.kind === 'loading') {
    // A price in another currency (Vinted CZ, eBay.co.uk for a German user, ...) is not prefilled.
    const foreign = listing.currency !== undefined && listing.currency !== marketCurrency;
    const prefill = listing.price !== undefined && !foreign;
    const currency = marketCurrency;
    const suggested = s.price ?? (prefill ? String(listing.marketplace === 'vinted' ? vintedTotal(listing.price!) : listing.price) : '');
    body = `
      <label>${esc(t('yourPrice'))}${listing.marketplace === 'vinted' && prefill ? ` (${esc(t('inclProtection'))})` : ''}
        <span class="price"><input inputmode="decimal" value="${esc(suggested)}" ${s.kind === 'loading' ? 'disabled' : ''}><span class="cur">${esc(currency)}</span></span>
      </label>
      ${foreign ? `<div class="muted">${esc(t('foreignCurrency').replace('{c}', listing.currency!).replace('{m}', marketCurrency))}</div>` : ''}
      ${s.kind === 'idle' && s.error ? `<div class="note">${esc(s.error)}</div>` : ''}
      ${
        s.kind === 'idle' && s.action
          ? `<a class="btn secondary" href="${esc(s.action === 'upgrade' ? `${APP_URL}/pricing` : APP_URL)}" target="_blank" rel="noopener">${esc(t(s.action))}</a>`
          : ''
      }
      <button class="primary" data-act="check" ${s.kind === 'loading' ? 'disabled' : ''}>${s.kind === 'loading' ? `<span class="spin"></span>${esc(t('checking'))}` : esc(t('check'))}</button>`;
  } else {
    const r = s.result;
    const v = r.valuation;
    const unsure = r.product.confidence < 0.7 ? ` · ${esc(t('unsure'))}` : '';
    body = `
      <div><div class="product">${esc(r.product.name)}</div>
        <div class="muted">${esc(formatMoney({ amountMinor: Math.round(r.purchasePrice * 100), currency: v.result.status === 'ok' ? v.result.profit.expected.purchasePrice.currency : (listing.currency ?? 'EUR') }))}${unsure}</div></div>
      ${verdictBlock(v.result, v.feePreset.label, true)}
      ${v.alt ? verdictBlock(v.alt.result, v.alt.label, false) : ''}
      <div class="row">
        ${v.scanId && v.result.status === 'ok' ? `<button class="secondary" data-act="bought" ${s.bought ? 'disabled' : ''}>${esc(s.bought ? t('added') : t('bought'))}</button>` : ''}
        <a class="btn secondary" href="${esc(APP_URL)}" target="_blank" rel="noopener">${esc(t('openApp'))}</a>
      </div>
      <button class="secondary" data-act="again">${esc(t('retry'))}</button>`;
  }
  root.innerHTML = `<style>${STYLE}</style>
    <div class="panel ${collapsed ? 'collapsed' : ''}">
      <div class="head" data-act="toggle"><span class="logo">F</span><b>FlipLens</b><span class="chev">${collapsed ? '▲' : '▼'}</span></div>
      <div class="body">${body}</div>
    </div>`;
}

function errorState(listing: ListingData, r: Extract<Reply<unknown>, { ok: false }>, price?: string): State {
  const idle = { kind: 'idle' as const, listing, ...(price !== undefined && { price }) };
  if (r.error === 'not_connected') return { ...idle, error: t('notConnected'), action: 'signIn' };
  if (r.error === 'extension_reloaded') return { ...idle, error: t('reloaded') };
  if (r.status === 401) return { ...idle, error: r.message ?? t('notConnected'), action: 'signIn' };
  if (r.status === 402) return { ...idle, error: r.message ?? r.error, action: 'upgrade' };
  return { ...idle, error: r.message ?? r.error };
}

async function onClick(e: Event): Promise<void> {
  const act = (e.composedPath().find((el) => el instanceof HTMLElement && el.dataset.act) as HTMLElement | undefined)?.dataset.act;
  if (!act || !state) return;
  if (act === 'toggle') {
    collapsed = !collapsed;
    void chrome.storage.local.set({ collapsed });
    return render();
  }
  const listing = state.listing;
  if (act === 'again') {
    state = { kind: 'idle', listing };
    return render();
  }
  if (act === 'check' && state.kind === 'idle') {
    const typed = root.querySelector('input')?.value ?? '';
    const price = parsePrice(typed);
    if (!price) {
      state = { ...state, price: typed, error: t('noPrice') };
      return render();
    }
    state = { kind: 'loading', listing, price: typed };
    render();
    const r = await send<CheckResult | { notIdentified: true }>({ type: 'check', listing, price });
    if (state?.listing !== listing) return; // navigated away meanwhile
    if (!r.ok) state = errorState(listing, r, typed);
    else if ('notIdentified' in r.data) state = { kind: 'idle', listing, price: typed, error: t('notIdentified') };
    else {
      state = { kind: 'result', listing, result: r.data };
      void remember(listing.url, r.data);
    }
    return render();
  }
  if (act === 'bought' && state.kind === 'result' && state.result.valuation.scanId) {
    const r = await send({ type: 'bought', scanId: state.result.valuation.scanId, price: state.result.purchasePrice, listing });
    if (state.kind === 'result' && state.listing === listing) {
      state = r.ok ? { ...state, bought: true } : errorState(listing, r);
      render();
    }
  }
}

// ---------- page lifecycle ----------

let currentUrl = '';

async function onUrl(): Promise<void> {
  const url = new URL(location.href);
  const key = url.origin + url.pathname;
  if (key === currentUrl) return;
  currentUrl = key;
  const id = adapter?.listingId(url);
  if (!adapter || !id) return unmount();
  // Single-page navigation: give the new listing a moment to render, then read it (a few tries; the last one takes
  // whatever the page shows even without structured data for this listing).
  let listing: ListingData | undefined;
  for (let i = 0; i < 10 && !listing; i++) {
    listing = adapter.read(url, id, i === 9);
    if (!listing) await new Promise((r) => setTimeout(r, 500));
    if (currentUrl !== key) return;
  }
  if (!listing) return unmount();
  mount();
  const hit = await cached(listing.url);
  state = hit ? { kind: 'result', listing, result: hit } : { kind: 'idle', listing };
  render();
}

async function start(): Promise<void> {
  const stored = (await chrome.storage.local.get(['collapsed', 'session'])) as { collapsed?: boolean; session?: Session };
  collapsed = stored.collapsed ?? false;
  if (stored.session) marketCurrency = marketFor(stored.session.settings.country, stored.session.settings.preset).currency;
  void onUrl();
  setInterval(() => void onUrl(), 1000);
}

void start();
