/**
 * Shared pieces of the static site generator (site.ts) and its language packs (site-it.ts, site-fr.ts).
 * No side effects here: language packs import this, never site.ts.
 */
import { PLANS, REFERRAL } from '@fliplens/core';

export const SITE = 'https://fliplens.eu';
export const UPDATED = '2026-10-12';

export type Lang = 'en' | 'de' | 'it' | 'fr';
export const LANGS: readonly Lang[] = ['en', 'de', 'it', 'fr'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', de: 'Deutsch', it: 'Italiano', fr: 'Français' };

export interface Faq { q: string; a: string }
export interface Section { h2: string; html: string }
export interface Page {
  path: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: Section[];
  faq?: Faq[];
  kind: 'page' | 'article';
  crumb: string;
  /** Call to action at the end; defaults to the price-check CTA. */
  cta?: string;
  parent?: { path: string; name: string };
}

/** Chrome of the static pages in one language. */
export interface UiStrings {
  nav: readonly (readonly [string, string])[];
  tryFree: string;
  privacy: string;
  terms: string;
  partner: string;
  about: string;
  compare: string;
  disclaimer: string;
  questions: string;
  answers: string;
  updated: (isoDate: string) => string;
  /** Open Graph locale, e.g. it_IT. */
  locale: string;
  /** Default call to action at the end of a page. */
  cta: string;
}

/** Everything one language contributes to the static site. */
export interface LangPack {
  /** Same paths as the English PAGES, including /guides (index) and /partner. */
  pages: Page[];
  /** Start-page FAQ. */
  commonFaq: Faq[];
  ui: UiStrings;
  /** Start page /<lang>: meta and the text for crawlers without JavaScript (one <div class="prerender" lang="..">). */
  home: { title: string; description: string; prerender: string };
}

/** Public URL of a page in a language: English at the root, others under /de, /it, /fr. */
export const href = (lang: Lang, path: string): string => (lang === 'en' ? path : path === '/' ? `/${lang}` : `/${lang}${path}`);

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Euro amount in a language's style: "€9.99" (en), "9,99 €" (de, it, fr). Whole amounts without decimals. */
export function eurIn(lang: Lang, minor: number): string {
  const fixed = (minor / 100).toFixed(2);
  if (lang === 'en') return `€${fixed.replace(/\.00$/, '')}`;
  return `${fixed.replace('.', ',').replace(/,00$/, '')} €`;
}
/** Whole number in a language's style (1.000 / 1 000 / 1,000). */
export const numIn = (lang: Lang, n: number): string => n.toLocaleString({ en: 'en-GB', de: 'de-DE', it: 'it-IT', fr: 'fr-FR' }[lang]);

/** Partner programme example: 50 invited people on Pro. */
export const EXAMPLE_PEOPLE = 50;
export const exampleMinor = Math.round((EXAMPLE_PEOPLE * PLANS.pro.priceMonthlyMinor * REFERRAL.sharePct) / 100);
export const INVITE_BONUS_CHECKS = REFERRAL.inviteeBonusChecks;
