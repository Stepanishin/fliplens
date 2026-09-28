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
