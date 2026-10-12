/**
 * In-app browsers (TikTok, Instagram, Facebook ...): Google blocks sign-in inside them ("disallowed_useragent"),
 * so visitors from creators' videos must be sent to a real browser.
 */
const APPS: readonly [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok|trill_/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Pinterest/i, 'Pinterest'],
  [/\bLine\//i, 'LINE'],
  [/Twitter/i, 'X'],
];

export interface InApp {
  app: string | null;
  os: 'ios' | 'android' | 'other';
}

/** null in a normal browser. `app` is null for an unknown Android WebView. */
export function detectInApp(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): InApp | null {
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'other';
  for (const [re, name] of APPS) if (re.test(ua)) return { app: name, os };
  if (os === 'android' && /; wv\)/.test(ua)) return { app: null, os };
  return null;
}

export const IN_APP = detectInApp();

/** Android: an intent link that opens the same page in Chrome (or the default browser) from most in-app browsers. */
export function chromeIntentUrl(href: string = window.location.href): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
