import type { FeePresetId } from '@fliplens/core';

/** Per-device conveniences: settings cache (synced to the server when it has a database) and the device id. */

export interface Settings {
  preset: FeePresetId;
  shippingCost: number;
  targetRoiPct: number;
  /** ISO country for marketplace links. */
  country: string;
}

const SETTINGS_KEY = 'fliplens.settings.v1';
const DEFAULT_SETTINGS: Settings = { preset: 'ebay_de_private', shippingCost: 6, targetRoiPct: 40, country: 'DE' };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode): ignore, the app works without it
  }
}

export const loadSettings = (): Settings => {
  // Drop keys from older versions (e.g. the removed demo `source` switch).
  const { preset, shippingCost, targetRoiPct, country } = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) };
  return { preset, shippingCost, targetRoiPct, country };
};
export const saveSettings = (s: Settings): void => write(SETTINGS_KEY, s);
const DEVICE_KEY = 'fliplens.device.v1';
let memoryDeviceId: string | undefined;

/** Random per-installation id: links this device's scans on the server until real accounts exist. */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
  } catch {
    // storage unavailable: fall back to an in-memory id for this session
  }
  const id = memoryDeviceId ?? randomId();
  memoryDeviceId = id;
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

/** After sign-out the device starts over as a new anonymous installation. */
export function resetDeviceId(): void {
  memoryDeviceId = randomId();
  try {
    localStorage.setItem(DEVICE_KEY, memoryDeviceId);
  } catch {
    // ignore
  }
}

function randomId(): string {
  // crypto.randomUUID needs a secure context; getRandomValues works on plain http (LAN testing) too.
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-');
}

