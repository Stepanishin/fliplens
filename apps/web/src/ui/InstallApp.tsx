import { useState } from 'react';
import { usePwaInstall } from '../pwa.js';

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
            <strong>Install FlipLens</strong>
            <span className="muted small">Open it from your home screen, full screen, in one tap.</span>
          </div>
          <button type="button" className="install-btn" onClick={onInstall}>Install</button>
          <button type="button" className="install-close" onClick={dismiss} aria-label="Dismiss">×</button>
        </section>
      ) : (
        <section className="card">
          <div className="card-head">
            <span>
              <strong>Install the app</strong>
              <br />
              <span className="muted small">Add FlipLens to your home screen.</span>
            </span>
            <button type="button" className="ghost" onClick={onInstall}>Install</button>
          </div>
        </section>
      )}

      {iosHelp && (
        <div className="sheet-backdrop" role="presentation" onClick={() => setIosHelp(false)}>
          <div className="sheet" role="dialog" aria-label="Install on iPhone" onClick={(e) => e.stopPropagation()}>
            <h2>Install on iPhone</h2>
            <ol className="ios-steps">
              <li>
                Tap the <strong>Share</strong> button
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></svg>
                in Safari's toolbar.
              </li>
              <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
            </ol>
            <button type="button" className="primary" onClick={() => setIosHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
