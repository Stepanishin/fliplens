import { PLANS, type PlanId } from '@fliplens/core';

/**
 * Two languages: English and German. Chosen once per page load:
 *   1. the /de start page always shows German (links for German creators and ads);
 *   2. otherwise the language the user picked (Profile, landing footer), remembered on this device;
 *   3. otherwise the browser language (de-* gets German, everything else English).
 * Switching reloads the page, so every module can read LANG as a constant.
 *
 * Strings live next to the code that uses them, as `tr({ en: {...}, de: {...} })`; TypeScript checks that both
 * languages have the same keys. Use functions for strings with values: `left: (n: number) => \`${n} left\``.
 */
export type Lang = 'en' | 'de';

const KEY = 'fliplens.lang.v1';

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'de' ? v : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  if (typeof window === 'undefined') return 'en';
  if (window.location.pathname === '/de' || window.location.pathname.startsWith('/de/')) return 'de';
  const s = stored();
  if (s) return s;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const base = l?.slice(0, 2).toLowerCase();
    if (base === 'de') return 'de';
    if (base === 'en') return 'en';
  }
  return 'en';
}

export const LANG: Lang = detect();
export const LOCALE = LANG === 'de' ? 'de-DE' : 'en-IE';
if (typeof document !== 'undefined') document.documentElement.lang = LANG;

/** Pick this language's strings. Both languages must have the same shape. */
export function tr<T>(m: { en: T; de: NoInfer<T> }): T {
  return m[LANG];
}

/** Remember the choice and reload. Leaving German from the /de start page goes to the neutral start page. */
export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  if (l === 'en' && (window.location.pathname === '/de' || window.location.pathname.startsWith('/de/'))) window.location.assign('/');
  else window.location.reload();
}

// ---------- formatting ----------

/** Euro amount from cents: "€121" / "121 €". */
export function money(minor: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / 100);
}

export function date(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Date(iso).toLocaleDateString(LOCALE, opts);
}

const AGO = tr({
  en: { unknown: 'unknown', now: 'just now', min: (n: number) => `${n} min ago`, h: (n: number) => `${n} h ago`, d: (n: number) => `${n} d ago` },
  de: { unknown: 'unbekannt', now: 'gerade eben', min: (n: number) => `vor ${n} Min.`, h: (n: number) => `vor ${n} Std.`, d: (n: number) => `vor ${n} T.` },
});

export function ago(iso: string | null): string {
  if (!iso) return AGO.unknown;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return AGO.now;
  if (min < 60) return AGO.min(min);
  const h = Math.round(min / 60);
  return h < 24 ? AGO.h(h) : AGO.d(Math.round(h / 24));
}

// ---------- API errors ----------

const ERRORS = tr({
  en: {
    quota_exceeded: 'You used all checks of your plan this month.',
    identify_limit: "You reached this month's recognition limit of your plan.",
    ai_budget: 'Photo recognition is paused for this month. You can still scan barcodes or type the item.',
    market_unavailable: 'eBay is not answering right now. Please try again in a few minutes; this check was not counted.',
    upgrade_required: `You used your ${PLANS.free.monthlyListings} free listings this month. Pro writes ${PLANS.pro.monthlyListings} a month.`,
    listing_limit: "You reached this month's listing limit of your plan.",
    sign_in_required: 'Please sign in with Google.',
    trial_used: 'Your free try is used. Sign in with Google to keep going: 10 free checks every month.',
    rate_limited: 'Too many requests. Please wait a moment.',
    unreachable: 'No connection. Check your internet and try again.',
    generic: 'Something went wrong. Please try again.',
  },
  de: {
    quota_exceeded: 'Du hast alle Checks deines Tarifs für diesen Monat verbraucht.',
    identify_limit: 'Du hast das Erkennungslimit deines Tarifs für diesen Monat erreicht.',
    ai_budget: 'Die Foto-Erkennung pausiert für diesen Monat. Barcode scannen oder Artikel eintippen geht weiterhin.',
    market_unavailable: 'eBay antwortet gerade nicht. Bitte versuch es in ein paar Minuten noch einmal; dieser Check wurde nicht gezählt.',
    upgrade_required: `Du hast deine ${PLANS.free.monthlyListings} kostenlosen Anzeigen für diesen Monat verbraucht. Mit Pro sind es ${PLANS.pro.monthlyListings} pro Monat.`,
    listing_limit: 'Du hast das Anzeigenlimit deines Tarifs für diesen Monat erreicht.',
    sign_in_required: 'Bitte melde dich mit Google an.',
    trial_used: 'Dein Gratis-Test ist verbraucht. Melde dich mit Google an und mach weiter: 10 kostenlose Checks jeden Monat.',
    rate_limited: 'Zu viele Anfragen. Bitte warte einen Moment.',
    unreachable: 'Keine Verbindung. Prüf dein Internet und versuch es noch einmal.',
    generic: 'Etwas ist schiefgelaufen. Bitte versuch es noch einmal.',
  },
});

/** User-facing text for an API error: known codes are translated, anything else falls back to the server message. */
export function errorText(e: unknown, fallback?: string): string {
  const err = e as { code?: string; message?: string; status?: number } | null;
  const code = err?.code;
  if (code && code in ERRORS && code !== 'generic' && code !== 'unreachable') return ERRORS[code as keyof typeof ERRORS];
  if (err?.status === 429) return ERRORS.rate_limited;
  if (!err?.status && err?.message?.startsWith('API unreachable')) return ERRORS.unreachable;
  if (LANG === 'en' && err?.message) return err.message;
  return fallback ?? ERRORS.generic;
}

// ---------- plans (names stay; feature lines are translated here) ----------

/** Both languages, exported for the static page generator (scripts/site.ts runs in Node, where LANG is always 'en'). */
export const PLAN_FEATURES_BY_LANG = {
  en: {
    free: PLANS.free.features,
    pro: PLANS.pro.features,
    reseller: PLANS.reseller.features,
  },
  de: {
    free: [`${PLANS.free.monthlyValuations} Checks pro Monat`, `${PLANS.free.monthlyListings} KI-Anzeigen für Vinted, eBay oder Kleinanzeigen`, 'Wiederverkaufswert, Gewinn, ROI und Lager'],
    pro: [`${PLANS.pro.monthlyValuations} Checks pro Monat`, 'Lager mit echtem Gewinn', `${PLANS.pro.monthlyListings} KI-Anzeigen für Vinted, eBay, Kleinanzeigen`],
    reseller: [`Unbegrenzte Checks (Fair Use ${PLANS.reseller.monthlyValuations.toLocaleString('de-DE')}/Monat)`, 'Alles aus Pro', 'Priorisierter Support und neue Funktionen zuerst'],
  },
} satisfies Record<Lang, Record<PlanId, readonly string[]>>;
const PLAN_FEATURES: Record<PlanId, readonly string[]> = PLAN_FEATURES_BY_LANG[LANG];

export function planFeatures(id: PlanId): readonly string[] {
  return PLAN_FEATURES[id];
}

// ---------- verdict reasons (built in English by @fliplens/core) ----------

const REASONS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^ROI n\/a \(free item\)$/, () => 'ROI n. v. (kostenloser Artikel)'],
  [/^ROI (-?[\d.]+)%$/, (m) => `ROI ${Math.round(Number(m[1])).toLocaleString('de-DE')} %`],
  [/^expected profit (.+)$/, (m) => `erwarteter Gewinn ${germanMoney(m[1]!)}`],
  [/^selling speed unknown \(only supply data\)$/, () => 'Verkaufstempo unbekannt (nur Angebotsdaten)'],
  [/^low demand$/, () => 'geringe Nachfrage'],
  [/^medium demand$/, () => 'mittlere Nachfrage'],
  [/^high demand$/, () => 'hohe Nachfrage'],
  [/^(\d+) comparable sales$/, (m) => `${m[1]} vergleichbare Verkäufe`],
  [/^(\d+) comparable active listings$/, (m) => `${m[1]} vergleichbare aktive Angebote`],
  [/^model identification confidence (\d+)%$/, (m) => `Modell zu ${m[1]} % sicher erkannt`],
  [/^based on asking prices, not sold prices$/, () => 'basiert auf Angebotspreisen, nicht auf Verkaufspreisen'],
  [/^wide price spread between comparables$/, () => 'große Preisspanne zwischen den Vergleichsangeboten'],
  [/^few comparables$/, () => 'wenige Vergleichsangebote'],
  [/^low overall confidence$/, () => 'insgesamt geringe Sicherheit'],
];

/** "€82.00" / "-€5.50" (core formatting) -> German "82 €" / "-5,50 €". */
function germanMoney(s: string): string {
  const n = Number(s.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return s;
  const minor = Math.round(n * 100);
  return money(minor, minor % 100 === 0 ? 0 : 2);
}

/** Decision factors and risks come from the core in English; German users get them translated. */
export function reason(s: string): string {
  if (LANG === 'en') return s;
  for (const [re, f] of REASONS) {
    const m = s.match(re);
    if (m) return f(m);
  }
  return s;
}

// ---------- fee presets (defined in English in @fliplens/core) ----------

const PRESET_DE: Record<string, { label: string; note: string }> = {
  ebay_de_private: {
    label: 'eBay.de (privat)',
    note: 'Keine Verkaufsgebühren für private Verkäufer innerhalb Deutschlands (seit 01.03.2023). Internationale Optionen können extra kosten.',
  },
  ebay_de_business: {
    label: 'eBay.de (gewerblich)',
    note: 'Seit 01.07.2026: gebrauchte/generalüberholte Elektronik 5 %, neu 7 %, Zubehör 12 %, Werkzeug 13 %, plus 0,45 € pro Bestellung über 10 €. Die Sätze für Spiele, Zubehör und Werkzeug sind weniger sicher.',
  },
  vinted: {
    label: 'Vinted',
    note: 'Keine Verkäufergebühren. Käufer zahlen den Käuferschutz (etwa 5 % + 0,70 €, bei Elektronik bis 8 %) und den Versand zusätzlich.',
  },
  local_pickup: { label: 'Abholung / bar', note: 'Keine Gebühren, kein Versand.' },
};

/** Label and note of a fee preset in the UI language. */
export function presetText(id: string, fallback: { label: string; note?: string }): { label: string; note: string } {
  const de = LANG === 'de' ? PRESET_DE[id] : undefined;
  return de ?? { label: fallback.label, note: fallback.note ?? '' };
}
