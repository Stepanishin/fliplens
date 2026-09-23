import type { Decision, FeePresetId, Money } from '@fliplens/core';
import type { ValuationRequest } from './api.js';

/** Per-device conveniences only. Real scan history moves to the API/DB in Phase 3. */

export interface Settings {
  source: 'ebay' | 'demo';
  preset: FeePresetId;
  shippingCost: number;
  targetRoiPct: number;
}

export interface HistoryEntry {
  at: string;
  request: ValuationRequest;
  summary: { decision: Decision; expected: Money; profit: Money } | { decision: 'insufficient' };
}

const SETTINGS_KEY = 'fliplens.settings.v1';
const HISTORY_KEY = 'fliplens.history.v1';
const DEFAULT_SETTINGS: Settings = { source: 'demo', preset: 'ebay_de_private', shippingCost: 6, targetRoiPct: 40 };

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

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) });
export const saveSettings = (s: Settings): void => write(SETTINGS_KEY, s);
export const loadHistory = (): HistoryEntry[] => read<HistoryEntry[]>(HISTORY_KEY, []);
export const saveHistory = (h: HistoryEntry[]): void => write(HISTORY_KEY, h);
