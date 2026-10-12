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
  it: { new: 'Nuovo', like_new: 'Come nuovo', very_good: 'Ottimo', good: 'Buono', fair: 'Discreto', poor: 'Scarso', for_parts: 'Per pezzi di ricambio' },
  fr: { new: 'Neuf', like_new: 'Comme neuf', very_good: 'Très bon état', good: 'Bon état', fair: 'État correct', poor: 'Mauvais état', for_parts: 'Pour pièces' },
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
  it: {
    headphones: 'Cuffie', smartphones: 'Smartphone', tablets: 'Tablet', laptops: 'Portatili', smartwatches: 'Smartwatch',
    speakers: 'Altoparlanti', routers: 'Router', streaming: 'Dispositivi di streaming', consoles: 'Console', handhelds: 'Console portatili',
    controllers: 'Controller', games: 'Videogiochi', camera_bodies: 'Fotocamere', lenses: 'Obiettivi', action_cameras: 'Action cam',
    compact_cameras: 'Fotocamere compatte', power_tools: 'Elettroutensili', other: 'Altro',
  },
  fr: {
    headphones: 'Casques et écouteurs', smartphones: 'Smartphones', tablets: 'Tablettes', laptops: 'Ordinateurs portables', smartwatches: 'Montres connectées',
    speakers: 'Enceintes', routers: 'Routeurs', streaming: 'Appareils de streaming', consoles: 'Consoles de jeux', handhelds: 'Consoles portables',
    controllers: 'Manettes', games: 'Jeux vidéo', camera_bodies: 'Appareils photo', lenses: 'Objectifs', action_cameras: 'Caméras d’action',
    compact_cameras: 'Appareils photo compacts', power_tools: 'Outillage électrique', other: 'Autres',
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
  it: {
    new: 'Sigillato o mai usato, nella confezione originale.',
    like_new: 'Aperto, nessun segno d’uso visibile.',
    very_good: 'Minimi segni d’uso, perfettamente funzionante.',
    good: 'Normali segni d’uso, perfettamente funzionante.',
    fair: 'Usura evidente o danni estetici, funziona ancora.',
    poor: 'Forte usura o parti mancanti, funziona ancora.',
    for_parts: 'Non funziona, da riparare o per pezzi di ricambio.',
  },
  fr: {
    new: 'Scellé ou jamais utilisé, dans son emballage d’origine.',
    like_new: 'Ouvert, aucune trace d’usage visible.',
    very_good: 'Traces d’usage minimes, fonctionne parfaitement.',
    good: 'Traces d’usage normales, fonctionne parfaitement.',
    fair: 'Usure nette ou défauts esthétiques, fonctionne encore.',
    poor: 'Forte usure ou pièces manquantes, fonctionne encore.',
    for_parts: 'Ne fonctionne pas, pour réparation ou pièces.',
  },
});

type DecisionMap = { strong_buy: string; buy: string; borderline: string; skip: string };

export const DECISION_LABEL: DecisionMap = tr<DecisionMap>({
  en: { strong_buy: 'STRONG BUY', buy: 'BUY', borderline: 'BORDERLINE', skip: 'SKIP' },
  de: { strong_buy: 'KLARER KAUF', buy: 'KAUFEN', borderline: 'GRENZWERTIG', skip: 'FINGER WEG' },
  it: { strong_buy: 'OTTIMO AFFARE', buy: 'COMPRA', borderline: 'AL LIMITE', skip: 'LASCIA STARE' },
  fr: { strong_buy: 'EXCELLENTE AFFAIRE', buy: 'ACHETER', borderline: 'LIMITE', skip: 'PASSE TON CHEMIN' },
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
  it: {
    wrong_variant: 'Variante sbagliata',
    model_not_found: 'Modello non nel titolo',
    accessory_only: 'Accessorio',
    box_only: 'Solo scatola',
    for_parts: 'Per pezzi di ricambio / guasto',
    bundle: 'Bundle',
    auction_unknown_final: 'Asta (nessun prezzo finale)',
    duplicate: 'Duplicato',
    outlier_low: 'Anomalo (basso)',
    outlier_high: 'Anomalo (alto)',
    suspected_scam: 'Sospetta truffa',
    stale: 'Troppo vecchio',
    condition_mismatch: 'Condizione troppo diversa',
    seller_cap: 'Stesso venditore (max 3)',
    currency_unknown: 'Valuta sconosciuta',
  },
  fr: {
    wrong_variant: 'Mauvaise variante',
    model_not_found: 'Modèle absent du titre',
    accessory_only: 'Accessoire',
    box_only: 'Boîte seule',
    for_parts: 'Pour pièces / en panne',
    bundle: 'Lot',
    auction_unknown_final: 'Enchère (pas de prix final)',
    duplicate: 'Doublon',
    outlier_low: 'Valeur aberrante (basse)',
    outlier_high: 'Valeur aberrante (haute)',
    suspected_scam: 'Arnaque suspectée',
    stale: 'Trop ancien',
    condition_mismatch: 'État trop différent',
    seller_cap: 'Même vendeur (max 3)',
    currency_unknown: 'Devise inconnue',
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
  it: {
    identification: 'Riconoscimento',
    comparable_count: 'Numero di annunci comparabili',
    similarity: 'Corrispondenza',
    freshness: 'Aggiornamento dei dati',
    data_kind: 'Venduti vs in vendita',
    spread: 'Forbice di prezzo',
  },
  fr: {
    identification: 'Identification',
    comparable_count: 'Nombre d’annonces comparables',
    similarity: 'Correspondance',
    freshness: 'Fraîcheur des données',
    data_kind: 'Vendus vs en vente',
    spread: 'Écart de prix',
  },
});

const PILL = tr({
  en: { noData: 'NO DATA', max: (p: string) => `MAX ${p}` },
  de: { noData: 'KEINE DATEN', max: (p: string) => `MAX. ${p}` },
  it: { noData: 'NESSUN DATO', max: (p: string) => `MAX ${p}` },
  fr: { noData: 'AUCUNE DONNÉE', max: (p: string) => `MAX ${p}` },
});

/** Pill for a saved check. Checked without a price: the useful answer is the max buy price, not a verdict. */
export function scanPill(s: { priceProvided?: boolean; purchasePrice: { amountMinor: number }; valuation: { decision: string | null } | null }): { cls: string; label: string } {
  if (!s.valuation?.decision) return { cls: 'd-insufficient', label: PILL.noData };
  if (s.priceProvided === false) return { cls: 'd-value', label: PILL.max(money(Math.round(s.purchasePrice.amountMinor / 100) * 100)) };
  return { cls: `d-${s.valuation.decision}`, label: DECISION_LABEL[s.valuation.decision as keyof DecisionMap] ?? s.valuation.decision };
}
