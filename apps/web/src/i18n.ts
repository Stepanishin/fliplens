import { marketFor, PLANS, type PlanId } from '@fliplens/core';

/**
 * Four languages: English, German, Italian and French. Chosen once per page load:
 *   1. the /de, /it and /fr start pages always show their language (links for creators and ads);
 *   2. otherwise the language the user picked (Profile, landing footer), remembered on this device;
 *   3. otherwise the browser language (de-*, it-*, fr-* get theirs, everything else English).
 * Switching reloads the page, so every module can read LANG as a constant.
 *
 * Strings live next to the code that uses them, as `tr({ en: {...}, de: {...}, it: {...}, fr: {...} })`; TypeScript
 * checks that all languages have the same keys. Use functions for strings with values: `left: (n: number) => \`${n} left\``.
 */
export type Lang = 'en' | 'de' | 'it' | 'fr';
export const LANGS: readonly Lang[] = ['en', 'de', 'it', 'fr'];
/** Each language in its own name, for language switchers. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', de: 'Deutsch', it: 'Italiano', fr: 'Français' };
const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);
/** Start page of a language: / for English, /de, /it, /fr for the others. */
export const langHome = (l: Lang): string => (l === 'en' ? '/' : `/${l}`);
/** The language whose start page (or page under it) this path is, if any. */
function pathLang(path: string): Lang | null {
  const seg = path.split('/')[1];
  return seg && seg !== 'en' && isLang(seg) ? seg : null;
}

const KEY = 'fliplens.lang.v1';

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function detect(): Lang {
  if (typeof window === 'undefined') return 'en';
  const fromPath = pathLang(window.location.pathname);
  if (fromPath) return fromPath;
  const s = stored();
  if (s) return s;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const base = l?.slice(0, 2).toLowerCase();
    if (isLang(base)) return base;
  }
  return 'en';
}

export const LANG: Lang = detect();
export const LOCALE = ({ en: 'en-IE', de: 'de-DE', it: 'it-IT', fr: 'fr-FR' } as const)[LANG];
if (typeof document !== 'undefined') document.documentElement.lang = LANG;

/** Pick this language's strings. All languages must have the same shape. */
export function tr<T>(m: { en: T; de: NoInfer<T>; it: NoInfer<T>; fr: NoInfer<T> }): T {
  return m[LANG];
}

/** Remember the choice and reload. On a language start page (/de, /it, /fr) go to the chosen language's one. */
export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  if (pathLang(window.location.pathname) && pathLang(window.location.pathname) !== l) window.location.assign(langHome(l) + window.location.search);
  else window.location.reload();
}

// ---------- formatting ----------

/**
 * The user's money: pounds when selling on eBay.co.uk (or in the UK on Vinted / locally), euro otherwise. Follows the settings;
 * FlipLens' own prices and referral payouts stay in euro (pass 'EUR').
 */
export type Currency = 'EUR' | 'GBP';
function initialCurrency(): Currency {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('fliplens.settings.v1');
    const s = raw ? (JSON.parse(raw) as { country?: string; preset?: string }) : {};
    return marketFor(s.country, s.preset).currency;
  } catch {
    return 'EUR';
  }
}
let currency: Currency = initialCurrency();
export const currencyFor = (s: { country: string; preset: string }): Currency => marketFor(s.country, s.preset).currency;
export function setCurrency(c: Currency): void {
  currency = c;
}
export const userCurrency = (): Currency => currency;
/** "€" or "£" for input fields. */
export const currencySymbol = (c: Currency = currency): string => (c === 'GBP' ? '£' : '€');

/** Amount from minor units in the user's currency (or the one given): "€121" / "121 €" / "£121". */
export function money(minor: number, digits = 0, c: Currency = currency): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: c, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / 100);
}

export function date(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Date(iso).toLocaleDateString(LOCALE, opts);
}

const AGO = tr({
  en: { unknown: 'unknown', now: 'just now', min: (n: number) => `${n} min ago`, h: (n: number) => `${n} h ago`, d: (n: number) => `${n} d ago` },
  de: { unknown: 'unbekannt', now: 'gerade eben', min: (n: number) => `vor ${n} Min.`, h: (n: number) => `vor ${n} Std.`, d: (n: number) => `vor ${n} T.` },
  it: { unknown: 'sconosciuto', now: 'proprio ora', min: (n: number) => `${n} min fa`, h: (n: number) => `${n} h fa`, d: (n: number) => `${n} g fa` },
  fr: { unknown: 'inconnu', now: "à l'instant", min: (n: number) => `il y a ${n} min`, h: (n: number) => `il y a ${n} h`, d: (n: number) => `il y a ${n} j` },
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
  it: {
    quota_exceeded: 'Hai usato tutti i controlli del tuo piano per questo mese.',
    identify_limit: 'Hai raggiunto il limite di riconoscimenti del tuo piano per questo mese.',
    ai_budget: 'Il riconoscimento da foto è in pausa per questo mese. Puoi ancora scansionare il codice a barre o scrivere il modello.',
    market_unavailable: 'eBay non risponde in questo momento. Riprova tra qualche minuto; questo controllo non è stato conteggiato.',
    upgrade_required: `Hai usato i tuoi ${PLANS.free.monthlyListings} annunci gratuiti di questo mese. Con Pro sono ${PLANS.pro.monthlyListings} al mese.`,
    listing_limit: 'Hai raggiunto il limite di annunci del tuo piano per questo mese.',
    sign_in_required: 'Accedi con Google.',
    trial_used: 'La tua prova gratuita è stata usata. Accedi con Google per continuare: 10 controlli gratuiti ogni mese.',
    rate_limited: 'Troppe richieste. Attendi un momento.',
    unreachable: 'Nessuna connessione. Controlla internet e riprova.',
    generic: 'Qualcosa è andato storto. Riprova.',
  },
  fr: {
    quota_exceeded: 'Tu as utilisé toutes les vérifications de ton offre ce mois-ci.',
    identify_limit: 'Tu as atteint la limite de reconnaissances de ton offre ce mois-ci.',
    ai_budget: "La reconnaissance par photo est en pause ce mois-ci. Tu peux toujours scanner le code-barres ou saisir l'article.",
    market_unavailable: "eBay ne répond pas pour le moment. Réessaie dans quelques minutes ; cette vérification n'a pas été comptée.",
    upgrade_required: `Tu as utilisé tes ${PLANS.free.monthlyListings} annonces gratuites ce mois-ci. Avec Pro, c'est ${PLANS.pro.monthlyListings} par mois.`,
    listing_limit: "Tu as atteint la limite d'annonces de ton offre ce mois-ci.",
    sign_in_required: 'Connecte-toi avec Google.',
    trial_used: 'Ton essai gratuit est utilisé. Connecte-toi avec Google pour continuer : 10 vérifications gratuites chaque mois.',
    rate_limited: 'Trop de requêtes. Patiente un instant.',
    unreachable: 'Pas de connexion. Vérifie ta connexion internet et réessaie.',
    generic: "Une erreur s'est produite. Réessaie.",
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

/** All languages, exported for the static page generator (scripts/site.ts runs in Node, where LANG is always 'en'). */
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
  it: {
    free: [`${PLANS.free.monthlyValuations} controlli al mese`, `${PLANS.free.monthlyListings} annunci con IA per Vinted ed eBay`, 'Valore di rivendita, profitto, ROI e magazzino'],
    pro: [`${PLANS.pro.monthlyValuations} controlli al mese`, 'Magazzino con profitto reale', `${PLANS.pro.monthlyListings} annunci con IA per Vinted ed eBay`],
    reseller: [`Controlli illimitati (uso corretto ${PLANS.reseller.monthlyValuations.toLocaleString('it-IT')}/mese)`, 'Tutto di Pro', 'Supporto prioritario e nuove funzioni in anteprima'],
  },
  fr: {
    free: [`${PLANS.free.monthlyValuations} vérifications par mois`, `${PLANS.free.monthlyListings} annonces IA pour Vinted et eBay`, 'Valeur de revente, bénéfice, ROI et stock'],
    pro: [`${PLANS.pro.monthlyValuations} vérifications par mois`, 'Stock avec bénéfice réel', `${PLANS.pro.monthlyListings} annonces IA pour Vinted et eBay`],
    reseller: [`Vérifications illimitées (usage raisonnable ${PLANS.reseller.monthlyValuations.toLocaleString('fr-FR')}/mois)`, 'Tout Pro', 'Support prioritaire et nouveautés en avant-première'],
  },
} satisfies Record<Lang, Record<PlanId, readonly string[]>>;
const PLAN_FEATURES: Record<PlanId, readonly string[]> = PLAN_FEATURES_BY_LANG[LANG];

export function planFeatures(id: PlanId): readonly string[] {
  return PLAN_FEATURES[id];
}

// ---------- verdict reasons (built in English by @fliplens/core) ----------

type Reasons = Record<string, (m: RegExpMatchArray) => string>;
/** Patterns of the English texts built by the core, in a fixed order. */
const REASON_PATTERNS: [string, RegExp][] = [
  ['free', /^ROI n\/a \(free item\)$/],
  ['roi', /^ROI (-?[\d.]+)%$/],
  ['profit', /^expected profit (.+)$/],
  ['speed', /^selling speed unknown \(only supply data\)$/],
  ['low', /^low demand$/],
  ['medium', /^medium demand$/],
  ['high', /^high demand$/],
  ['sales', /^(\d+) comparable sales$/],
  ['active', /^(\d+) comparable active listings$/],
  ['ident', /^model identification confidence (\d+)%$/],
  ['asking', /^based on asking prices, not sold prices$/],
  ['spread', /^wide price spread between comparables$/],
  ['few', /^few comparables$/],
  ['lowconf', /^low overall confidence$/],
];
const pct = (n: string | number) => `${Math.round(Number(n)).toLocaleString(LOCALE)} %`;
const REASON_TEXT: Record<Exclude<Lang, 'en'>, Reasons> = {
  de: {
    free: () => 'ROI n. v. (kostenloser Artikel)',
    roi: (m) => `ROI ${pct(m[1]!)}`,
    profit: (m) => `erwarteter Gewinn ${localMoney(m[1]!)}`,
    speed: () => 'Verkaufstempo unbekannt (nur Angebotsdaten)',
    low: () => 'geringe Nachfrage',
    medium: () => 'mittlere Nachfrage',
    high: () => 'hohe Nachfrage',
    sales: (m) => `${m[1]} vergleichbare Verkäufe`,
    active: (m) => `${m[1]} vergleichbare aktive Angebote`,
    ident: (m) => `Modell zu ${m[1]} % sicher erkannt`,
    asking: () => 'basiert auf Angebotspreisen, nicht auf Verkaufspreisen',
    spread: () => 'große Preisspanne zwischen den Vergleichsangeboten',
    few: () => 'wenige Vergleichsangebote',
    lowconf: () => 'insgesamt geringe Sicherheit',
  },
  it: {
    free: () => 'ROI n/d (articolo gratuito)',
    roi: (m) => `ROI ${pct(m[1]!)}`,
    profit: (m) => `profitto previsto ${localMoney(m[1]!)}`,
    speed: () => 'velocità di vendita sconosciuta (solo dati di offerta)',
    low: () => 'domanda bassa',
    medium: () => 'domanda media',
    high: () => 'domanda alta',
    sales: (m) => `${m[1]} vendite comparabili`,
    active: (m) => `${m[1]} annunci attivi comparabili`,
    ident: (m) => `modello riconosciuto con il ${m[1]} % di sicurezza`,
    asking: () => 'basato sui prezzi richiesti, non sui prezzi di vendita',
    spread: () => 'forte differenza di prezzo tra gli annunci comparabili',
    few: () => 'pochi annunci comparabili',
    lowconf: () => 'affidabilità complessiva bassa',
  },
  fr: {
    free: () => 'ROI n/d (article gratuit)',
    roi: (m) => `ROI ${pct(m[1]!)}`,
    profit: (m) => `bénéfice attendu ${localMoney(m[1]!)}`,
    speed: () => 'vitesse de vente inconnue (seulement des annonces en cours)',
    low: () => 'demande faible',
    medium: () => 'demande moyenne',
    high: () => 'demande forte',
    sales: (m) => `${m[1]} ventes comparables`,
    active: (m) => `${m[1]} annonces actives comparables`,
    ident: (m) => `modèle reconnu avec ${m[1]} % de certitude`,
    asking: () => 'basé sur les prix demandés, pas sur les prix de vente',
    spread: () => 'grand écart de prix entre les annonces comparables',
    few: () => 'peu d’annonces comparables',
    lowconf: () => 'fiabilité globale faible',
  },
};

/** "€82.00" / "-€5.50" (core formatting) -> the UI locale, e.g. German "82 €" / "-5,50 €". */
function localMoney(s: string): string {
  const n = Number(s.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return s;
  const minor = Math.round(n * 100);
  return money(minor, minor % 100 === 0 ? 0 : 2);
}

/** Decision factors and risks come from the core in English; other languages get them translated. */
export function reason(s: string): string {
  if (LANG === 'en') return s;
  for (const [key, re] of REASON_PATTERNS) {
    const m = s.match(re);
    if (m) return REASON_TEXT[LANG][key]?.(m) ?? s;
  }
  return s;
}

// ---------- fee presets (defined in English in @fliplens/core) ----------

type PresetTexts = Record<string, { label: string; note: string }>;
const PRESET_TEXT: Record<Exclude<Lang, 'en'>, PresetTexts> = {
  de: {
    ebay_de_private: {
      label: 'eBay.de (privat)',
      note: 'Keine Verkaufsgebühren für private Verkäufer innerhalb Deutschlands (seit 01.03.2023). Internationale Optionen können extra kosten.',
    },
    ebay_de_business: {
      label: 'eBay.de (gewerblich)',
      note: 'Seit 01.07.2026: gebrauchte/generalüberholte Elektronik 5 %, neu 7 %, Zubehör 12 %, Werkzeug 13 %, plus 0,45 € pro Bestellung über 10 €. Die Sätze für Spiele, Zubehör und Werkzeug sind weniger sicher.',
    },
    ebay_it_private: {
      label: 'eBay.it (privat)',
      note: 'Seit 01.09.2026 keine Verkaufsgebühren für private Verkäufer mit Sitz im EWR; der Käufer zahlt eine Käuferschutzgebühr. Optionale Upgrades und Versand außerhalb der Eurozone können extra kosten.',
    },
    ebay_fr_private: {
      label: 'eBay.fr (privat)',
      note: 'Seit 01.09.2026 keine Verkaufsgebühren für private Verkäufer mit Sitz im EWR (bis 150 Angebote pro Monat, danach 0,35 € pro Angebot); der Käufer zahlt eine Schutzgebühr. Versand außerhalb der Eurozone kann extra kosten.',
    },
    vinted: {
      label: 'Vinted',
      note: 'Keine Verkäufergebühren. Käufer zahlen den Käuferschutz (etwa 5 % + 0,70 €, bei Elektronik bis 8 %) und den Versand zusätzlich.',
    },
    ebay_uk_private: {
      label: 'eBay.co.uk (privat)',
      note: 'Keine Verkaufsprovision und keine Regulierungsgebühr für private Verkäufer mit Sitz in Großbritannien (außer Fahrzeuge); 300 kostenlose Angebote pro Monat. Upgrades und Versand ins Ausland können extra kosten.',
    },
    local_pickup: { label: 'Abholung / bar', note: 'Keine Gebühren, kein Versand.' },
  },
  it: {
    ebay_de_private: {
      label: 'eBay.de (privato)',
      note: 'Nessuna commissione di vendita per i venditori privati in Germania (dal 01/03/2023). Le opzioni internazionali possono costare di più.',
    },
    ebay_de_business: {
      label: 'eBay.de (professionale)',
      note: 'Dal 01/07/2026: elettronica usata/ricondizionata 5 %, nuova 7 %, accessori 12 %, utensili 13 %, più 0,45 € per ordine sopra 10 €. Le tariffe per giochi, accessori e utensili sono meno certe.',
    },
    ebay_it_private: {
      label: 'eBay.it (privato)',
      note: "Dal 01/09/2026 nessuna commissione di vendita per i venditori privati con sede nello SEE; l'acquirente paga una tariffa di protezione acquisti. Opzioni facoltative e spedizioni fuori dall'eurozona possono costare di più.",
    },
    ebay_fr_private: {
      label: 'eBay.fr (privato)',
      note: "Dal 01/09/2026 nessuna commissione di vendita per i venditori privati con sede nello SEE (fino a 150 annunci al mese, poi 0,35 € l'uno); l'acquirente paga una tariffa di protezione. Le spedizioni fuori dall'eurozona possono costare di più.",
    },
    vinted: {
      label: 'Vinted',
      note: "Nessuna commissione per chi vende. L'acquirente paga la protezione acquisti (circa 5 % + 0,70 €, fino all'8 % per l'elettronica) e la spedizione.",
    },
    ebay_uk_private: {
      label: 'eBay.co.uk (privato)',
      note: 'Nessuna commissione sul valore finale né tariffa regolamentare per i venditori privati con sede nel Regno Unito (veicoli esclusi); 300 annunci gratuiti al mese. Upgrade e spedizioni internazionali possono costare di più.',
    },
    local_pickup: { label: 'Ritiro di persona / contanti', note: 'Nessuna commissione, nessuna spedizione.' },
  },
  fr: {
    ebay_de_private: {
      label: 'eBay.de (particulier)',
      note: "Aucuns frais de vente pour les particuliers en Allemagne (depuis le 01/03/2023). Les options internationales peuvent coûter en plus.",
    },
    ebay_de_business: {
      label: 'eBay.de (professionnel)',
      note: "Depuis le 01/07/2026 : électronique d'occasion/reconditionnée 5 %, neuve 7 %, accessoires 12 %, outils 13 %, plus 0,45 € par commande au-delà de 10 €. Les taux pour les jeux, accessoires et outils sont moins sûrs.",
    },
    ebay_it_private: {
      label: 'eBay.it (particulier)',
      note: "Depuis le 01/09/2026, aucuns frais de vente pour les particuliers établis dans l'EEE ; l'acheteur paie des frais de protection. Les options payantes et l'envoi hors zone euro peuvent coûter en plus.",
    },
    ebay_fr_private: {
      label: 'eBay.fr (particulier)',
      note: "Depuis le 01/09/2026, aucuns frais de vente pour les particuliers établis dans l'EEE (jusqu'à 150 annonces par mois, puis 0,35 € par annonce) ; l'acheteur paie des frais de protection. L'envoi hors zone euro peut coûter en plus.",
    },
    vinted: {
      label: 'Vinted',
      note: "Aucuns frais pour le vendeur. L'acheteur paie la protection acheteurs (environ 5 % + 0,70 €, jusqu'à 8 % pour l'électronique) et la livraison en plus.",
    },
    ebay_uk_private: {
      label: 'eBay.co.uk (particulier)',
      note: "Pas de commission sur le prix final ni de frais réglementaires pour les particuliers établis au Royaume-Uni (hors véhicules) ; 300 annonces gratuites par mois. Les options et l'envoi à l'international peuvent coûter en plus.",
    },
    local_pickup: { label: 'Remise en main propre / espèces', note: 'Aucuns frais, pas de livraison.' },
  },
};

/** Label and note of a fee preset in the UI language. */
export function presetText(id: string, fallback: { label: string; note?: string }): { label: string; note: string } {
  const t = LANG === 'en' ? undefined : PRESET_TEXT[LANG][id];
  return t ?? { label: fallback.label, note: fallback.note ?? '' };
}
