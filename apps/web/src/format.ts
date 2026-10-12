import { toMajor, type Money } from '@fliplens/core';
import { ago as agoI18n, LOCALE, money, tr } from './i18n.js';

export function fmt(m: Money, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajor(m));
}

export function ago(iso: string | null): string {
  return agoI18n(iso);
}

type ConditionMap = { new: string; like_new: string; very_good: string; good: string; fair: string; poor: string; for_parts: string };

export const CONDITION_LABEL: ConditionMap = tr<ConditionMap>({
  en: { new: 'New', like_new: 'Like new', very_good: 'Very good', good: 'Good', fair: 'Fair', poor: 'Poor', for_parts: 'For parts' },
  de: { new: 'Neu', like_new: 'Wie neu', very_good: 'Sehr gut', good: 'Gut', fair: 'Akzeptabel', poor: 'Stark gebraucht', for_parts: 'Defekt / für Bastler' },
});

export const CATEGORY_NAME: Record<string, string> = tr<Record<string, string>>({
  en: {
    headphones: 'Headphones', smartphones: 'Smartphones', tablets: 'Tablets', laptops: 'Laptops', smartwatches: 'Smartwatches',
    speakers: 'Speakers', routers: 'Routers', streaming: 'Streaming devices', consoles: 'Game consoles', handhelds: 'Handheld consoles',
    controllers: 'Controllers', games: 'Video games', camera_bodies: 'Cameras', lenses: 'Lenses', action_cameras: 'Action cameras',
    compact_cameras: 'Compact cameras', power_tools: 'Power tools', other: 'Other',
  },
  de: {
    headphones: 'Kopfhörer', smartphones: 'Smartphones', tablets: 'Tablets', laptops: 'Laptops', smartwatches: 'Smartwatches',
    speakers: 'Lautsprecher', routers: 'Router', streaming: 'Streaming-Geräte', consoles: 'Spielkonsolen', handhelds: 'Handheld-Konsolen',
    controllers: 'Controller', games: 'Videospiele', camera_bodies: 'Kameras', lenses: 'Objektive', action_cameras: 'Actioncams',
    compact_cameras: 'Kompaktkameras', power_tools: 'Elektrowerkzeuge', other: 'Sonstiges',
  },
});

export const CONDITION_HINT: ConditionMap = tr<ConditionMap>({
  en: {
    new: 'Sealed or unused, in the original packaging.',
    like_new: 'Opened, no visible signs of use.',
    very_good: 'Minimal signs of use, fully working.',
    good: 'Normal signs of use, fully working.',
    fair: 'Clear wear or cosmetic damage, still working.',
    poor: 'Heavy wear or missing parts, still working.',
    for_parts: 'Not working, for repair or parts.',
  },
  de: {
    new: 'Versiegelt oder unbenutzt, in Originalverpackung.',
    like_new: 'Geöffnet, keine sichtbaren Gebrauchsspuren.',
    very_good: 'Minimale Gebrauchsspuren, voll funktionsfähig.',
    good: 'Normale Gebrauchsspuren, voll funktionsfähig.',
    fair: 'Deutliche Gebrauchsspuren oder optische Schäden, funktioniert noch.',
    poor: 'Starke Abnutzung oder fehlende Teile, funktioniert noch.',
    for_parts: 'Funktioniert nicht, für Reparatur oder Ersatzteile.',
  },
});

type DecisionMap = { strong_buy: string; buy: string; borderline: string; skip: string };

export const DECISION_LABEL: DecisionMap = tr<DecisionMap>({
  en: { strong_buy: 'STRONG BUY', buy: 'BUY', borderline: 'BORDERLINE', skip: 'SKIP' },
  de: { strong_buy: 'KLARER KAUF', buy: 'KAUFEN', borderline: 'GRENZWERTIG', skip: 'FINGER WEG' },
});

export const REASON_LABEL: Record<string, string> = tr<Record<string, string>>({
  en: {
    wrong_variant: 'Wrong variant',
    model_not_found: 'Model not in title',
    accessory_only: 'Accessory',
    box_only: 'Box only',
    for_parts: 'For parts / broken',
    bundle: 'Bundle',
    auction_unknown_final: 'Auction (no final price)',
    duplicate: 'Duplicate',
    outlier_low: 'Outlier (low)',
    outlier_high: 'Outlier (high)',
    suspected_scam: 'Suspected scam',
    stale: 'Too old',
    condition_mismatch: 'Condition too different',
    seller_cap: 'Same seller (max 3)',
    currency_unknown: 'Unknown currency',
  },
  de: {
    wrong_variant: 'Falsche Variante',
    model_not_found: 'Modell nicht im Titel',
    accessory_only: 'Zubehör',
    box_only: 'Nur Verpackung',
    for_parts: 'Defekt / für Bastler',
    bundle: 'Bundle',
    auction_unknown_final: 'Auktion (kein Endpreis)',
    duplicate: 'Duplikat',
    outlier_low: 'Ausreißer (niedrig)',
    outlier_high: 'Ausreißer (hoch)',
    suspected_scam: 'Verdacht auf Betrug',
    stale: 'Zu alt',
    condition_mismatch: 'Zustand zu verschieden',
    seller_cap: 'Gleicher Verkäufer (max. 3)',
    currency_unknown: 'Unbekannte Währung',
  },
});

export const FACTOR_LABEL: Record<string, string> = tr<Record<string, string>>({
  en: {
    identification: 'Identification',
    comparable_count: 'Comparable count',
    similarity: 'Match quality',
    freshness: 'Data freshness',
    data_kind: 'Sold vs asking',
    spread: 'Price spread',
  },
  de: {
    identification: 'Erkennung',
    comparable_count: 'Anzahl Vergleichsangebote',
    similarity: 'Übereinstimmung',
    freshness: 'Aktualität der Daten',
    data_kind: 'Verkauft vs. angeboten',
    spread: 'Preisspanne',
  },
});

const PILL = tr({
  en: { noData: 'NO DATA', max: (p: string) => `MAX ${p}` },
  de: { noData: 'KEINE DATEN', max: (p: string) => `MAX. ${p}` },
});

/** Pill for a saved check. Checked without a price: the useful answer is the max buy price, not a verdict. */
export function scanPill(s: { priceProvided?: boolean; purchasePrice: { amountMinor: number }; valuation: { decision: string | null } | null }): { cls: string; label: string } {
  if (!s.valuation?.decision) return { cls: 'd-insufficient', label: PILL.noData };
  if (s.priceProvided === false) return { cls: 'd-value', label: PILL.max(money(Math.round(s.purchasePrice.amountMinor / 100) * 100)) };
  return { cls: `d-${s.valuation.decision}`, label: DECISION_LABEL[s.valuation.decision as keyof DecisionMap] ?? s.valuation.decision };
}
