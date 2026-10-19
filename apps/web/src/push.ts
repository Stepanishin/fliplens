import { api } from './api.js';

/** Web push for price alerts. iPhone: only in the app added to the Home Screen (iOS 16.4+). */
export const pushSupported = (): boolean => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent);

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Asks for permission (once), subscribes this device and tells the server. */
export async function enablePush(): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api.alertsConfig();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api.pushSubscribe(sub.toJSON());
  return 'ok';
}
