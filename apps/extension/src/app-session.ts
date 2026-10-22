import { send, type Session, type Settings } from './shared.js';

/**
 * Runs on the FlipLens web app only. Hands the app's device key and settings to the extension, so the extension
 * checks as the same account and with the same platform, shipping and ROI target (ADR-032). Signing out in the app
 * resets its device key, and the extension follows on the next visit.
 */

const DEFAULTS: Settings = { preset: 'ebay_de_private', shippingCost: 6, targetRoiPct: 40, country: 'DE' };

function read(): Session | undefined {
  try {
    const deviceId = localStorage.getItem('fliplens.device.v1');
    if (!deviceId) return undefined;
    const settings = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem('fliplens.settings.v1') ?? '{}') as Partial<Settings>) };
    const clothesOnVinted = JSON.parse(localStorage.getItem('fliplens.clothesOnVinted.v1') ?? 'true') !== false;
    return { deviceId, settings, clothesOnVinted };
  } catch {
    return undefined;
  }
}

let last = '';
function sync(): void {
  const s = read();
  const key = JSON.stringify(s ?? null);
  if (!s || key === last) return;
  last = key;
  void send({ type: 'session', session: s });
}

sync();
// The app writes the key and settings while it runs (first visit, sign-out, settings screen).
setInterval(() => {
  if (document.visibilityState === 'visible') sync();
}, 3000);
