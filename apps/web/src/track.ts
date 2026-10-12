import { deviceId } from './storage.js';

/**
 * First-party product analytics (spec section 62). Batched, fire-and-forget, never blocks the UI.
 * Props are small scalars only: no product free text beyond category, no prices tied to identity.
 */

type Props = Record<string, string | number | boolean | null>;
const queue: { name: string; props: Props }[] = [];
let timer: number | undefined;

export function track(name: string, props: Props = {}): void {
  queue.push({ name, props });
  if (timer === undefined) timer = window.setTimeout(flush, 1500);
}

function flush(): void {
  timer = undefined;
  const events = queue.splice(0, 50);
  if (events.length === 0) return;
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId() },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => undefined);
  if (queue.length > 0) timer = window.setTimeout(flush, 1500);
}

window.addEventListener('pagehide', flush);

/**
 * One "visit" per browser tab session: where people come from (referrer host, utm_source) and on what.
 * No cookies and no third-party scripts; the server stores only a hash of the random device id.
 */
const INVITE_KEY = 'fliplens.invite.v1';
const INVITE_DAYS = 30;

/** An invite code from a ?ref= link, kept for 30 days on this device (first link wins) until the user signs up. */
export function inviteCode(): string | undefined {
  try {
    const raw = localStorage.getItem(INVITE_KEY);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as { code?: string; at?: number };
    if (!v.code || !v.at || Date.now() - v.at > INVITE_DAYS * 86_400_000) return undefined;
    return v.code;
  } catch {
    return undefined;
  }
}

function rememberInvite(): string | null {
  const code = new URLSearchParams(window.location.search).get('ref')?.trim().toLowerCase().slice(0, 40) ?? '';
  if (!/^[a-z0-9][a-z0-9-]{2,23}$/.test(code)) return null;
  try {
    if (!inviteCode()) localStorage.setItem(INVITE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // storage blocked: the invite only works if they sign up right away
  }
  return code;
}

export function trackVisit(): void {
  const invite = rememberInvite();
  try {
    if (sessionStorage.getItem('fliplens.visit')) return;
    sessionStorage.setItem('fliplens.visit', '1');
  } catch {
    // storage blocked: count the visit anyway
  }
  let ref: string | null = null;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    ref = host && host !== window.location.hostname ? host.replace(/^www\./, '').slice(0, 100) : null;
  } catch {
    ref = null;
  }
  const utm = new URLSearchParams(window.location.search).get('utm_source');
  track('visit', {
    ref,
    utm: utm ? utm.slice(0, 60) : null,
    entry: window.location.pathname.slice(0, 40),
    mobile: window.matchMedia('(pointer: coarse)').matches,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    lang: navigator.language.slice(0, 2),
    invite,
  });
}
