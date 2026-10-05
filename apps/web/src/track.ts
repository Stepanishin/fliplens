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
export function trackVisit(): void {
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
  });
}
