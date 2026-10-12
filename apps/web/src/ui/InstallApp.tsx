import { useState } from 'react';
import { usePwaInstall } from '../pwa.js';
import { tr } from '../i18n.js';

const T = tr({
  en: {
    installTitle: 'Install FlipLens',
    installSub: 'Open it from your home screen, full screen, in one tap.',
    install: 'Install',
    dismiss: 'Dismiss',
    rowTitle: 'Install the app',
    rowSub: 'Add FlipLens to your home screen.',
    iosTitle: 'Install on iPhone',
    tapThe: 'Tap the',
    share: 'Share',
    button: 'button',
    inToolbar: "in Safari's toolbar.",
    choose: 'Choose',
    addToHome: 'Add to Home Screen',
    then: ', then',
    add: 'Add',
    gotIt: 'Got it',
  },
  de: {
    installTitle: 'FlipLens installieren',
    installSub: 'Mit einem Tipp vom Homescreen starten, im Vollbild.',
    install: 'Installieren',
    dismiss: 'Schließen',
    rowTitle: 'App installieren',
    rowSub: 'FlipLens zum Homescreen hinzufügen.',
    iosTitle: 'Auf dem iPhone installieren',
    tapThe: 'Tippe in der Safari-Leiste auf',
    share: 'Teilen',
    button: '',
    inToolbar: '.',
    choose: 'Wähle',
    addToHome: 'Zum Home-Bildschirm',
    then: ', dann',
    add: 'Hinzufügen',
    gotIt: 'Verstanden',
  },
});

const DISMISS_KEY = 'fliplens.install-dismissed.v1';

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Home card ("banner") or Profile row ("row") offering to install FlipLens on the home screen. */
export function InstallApp({ variant }: { variant: 'banner' | 'row' }) {
  const { mode, install } = usePwaInstall();
  const [hidden, setHidden] = useState(() => variant === 'banner' && dismissed());
  const [iosHelp, setIosHelp] = useState(false);

  if (mode === 'none' || hidden) return null;

  const onInstall = () => {
    if (mode === 'prompt') void install();
    else setIosHelp(true);
  };
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <section className="install-card">
          <img src="/icons/icon-192.png" alt="" width={44} height={44} />
          <div className="install-text">
            <strong>{T.installTitle}</strong>
            <span className="muted small">{T.installSub}</span>
          </div>
          <button type="button" className="install-btn" onClick={onInstall}>{T.install}</button>
          <button type="button" className="install-close" onClick={dismiss} aria-label={T.dismiss}>×</button>
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <span>
              <strong>{T.rowTitle}</strong>
              <br />
              <span className="muted small">{T.rowSub}</span>
            </span>
            <button type="button" className="ghost" onClick={onInstall}>{T.install}</button>
          </div>
        </section>
      )}

      {iosHelp && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setIosHelp(false)}>
          <div className="sheet" role="dialog" aria-label={T.iosTitle} onClick={(e) => e.stopPropagation()}>
            <h2>{T.iosTitle}</h2>
            <ol className="ios-steps">
              <li>
                {T.tapThe} <strong>{T.share}</strong>{T.button && ` ${T.button}`}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></svg>
                {T.inToolbar}
              </li>
              <li>{T.choose} <strong>{T.addToHome}</strong>{T.then} <strong>{T.add}</strong>.</li>
            </ol>
            <button type="button" className="primary" onClick={() => setIosHelp(false)}>{T.gotIt}</button>
          </div>
        </div>
      )}
    </>
  );
}
