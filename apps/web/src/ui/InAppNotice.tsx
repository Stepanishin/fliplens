import { useState } from 'react';
import { tr } from '../i18n.js';
import { chromeIntentUrl, IN_APP } from '../inapp.js';
import { track } from '../track.js';

const T = tr({
  en: {
    title: 'Open FlipLens in your browser',
    text: (app: string | null) => `Google sign-in does not work inside ${app ?? 'this app'}. Open this page in your browser to sign in:`,
    ios: 'Tap ⋯ or the share icon (top or bottom right), then "Open in browser" or "Open in Safari".',
    android: 'Tap ⋮ (top right), then "Open in browser" or "Open in Chrome".',
    chrome: 'Open in Chrome',
    copy: 'Copy link',
    copied: 'Link copied. Paste it into your browser.',
  },
  de: {
    title: 'Öffne FlipLens in deinem Browser',
    text: (app: string | null) => `Die Anmeldung mit Google funktioniert nicht in ${app ?? 'dieser App'}. Öffne die Seite in deinem Browser, um dich anzumelden:`,
    ios: 'Tippe auf ⋯ oder das Teilen-Symbol (oben oder unten rechts) und dann auf „Im Browser öffnen" oder „In Safari öffnen".',
    android: 'Tippe auf ⋮ (oben rechts) und dann auf „Im Browser öffnen" oder „In Chrome öffnen".',
    chrome: 'In Chrome öffnen',
    copy: 'Link kopieren',
    copied: 'Link kopiert. Füg ihn in deinem Browser ein.',
  },
});

/** Shown instead of the Google button inside TikTok, Instagram and other in-app browsers. */
export function InAppNotice({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!IN_APP) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      window.prompt(T.copy, window.location.href);
    }
    setCopied(true);
    track('inapp_link_copied', { app: IN_APP?.app ?? 'webview' });
  }

  if (compact) {
    return (
      <button type="button" className="ghost small" onClick={() => void copy()}>
        {copied ? '✓' : T.copy}
      </button>
    );
  }

  return (
    <div className="inapp">
      <strong>{T.title}</strong>
      <p>{T.text(IN_APP.app)}</p>
      <p className="muted small">{IN_APP.os === 'android' ? T.android : T.ios}</p>
      <div className="inapp-actions">
        {IN_APP.os === 'android' && (
          <a className="primary" href={chromeIntentUrl()} onClick={() => track('inapp_open_chrome', { app: IN_APP?.app ?? 'webview' })}>
            {T.chrome}
          </a>
        )}
        <button type="button" className="ghost" onClick={() => void copy()}>{T.copy}</button>
      </div>
      {copied && <p className="muted small">{T.copied}</p>}
    </div>
  );
}
