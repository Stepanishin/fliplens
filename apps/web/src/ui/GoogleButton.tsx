import { useEffect, useRef, useState } from 'react';
import { track } from '../track.js';

/** "Sign in with Google" via Google Identity Services. Returns an ID token (credential) to verify on the server. */

interface GsiButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'continue_with' | 'signin';
  shape?: 'pill' | 'rectangular';
  width?: number;
}
interface Gsi {
  accounts: {
    id: {
      initialize(opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; auto_select?: boolean }): void;
      renderButton(el: HTMLElement, cfg: GsiButtonConfig & { locale?: string }): void;
      disableAutoSelect(): void;
    };
  };
}
declare global {
  interface Window {
    google?: Gsi;
  }
}

let loading: Promise<Gsi> | undefined;
function loadGsi(): Promise<Gsi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve(window.google);
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google script loaded without API')));
    s.onerror = () => {
      loading = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function signOutGoogle(): void {
  window.google?.accounts.id.disableAutoSelect();
}

/** One Google client per page: every button shares it, the latest mounted handler receives the credential. */
let initializedFor: string | undefined;
let credentialHandler: ((credential: string) => void) | undefined;

export function GoogleButton({
  clientId,
  onCredential,
  compact = false,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  /** Small "Sign in" pill for headers. */
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    credentialHandler = onCredential;
  }, [onCredential]);

  // Google's button is a cross-origin iframe, so its clicks never reach us. A click moves focus into that iframe and
  // blurs our window: count it as "sign-in started" (funnel step between visiting and signing in).
  useEffect(() => {
    let sent = false;
    const onBlur = () => {
      window.setTimeout(() => {
        const el = document.activeElement;
        if (!sent && el?.tagName === 'IFRAME' && ref.current?.contains(el)) {
          sent = true;
          track('signin_started', { compact });
        }
      }, 0);
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [compact]);

  useEffect(() => {
    let cancelled = false;
    loadGsi().then(
      (g) => {
        if (cancelled || !ref.current) return;
        if (initializedFor !== clientId) {
          g.accounts.id.initialize({ client_id: clientId, callback: (r) => credentialHandler?.(r.credential), ux_mode: 'popup' });
          initializedFor = clientId;
        }
        if (compact) {
          g.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'medium', text: 'signin_with', shape: 'pill', locale: 'en' });
        } else {
          // A zero-width container (e.g. inside a centred flex column) makes Google render nothing: always pass a real width.
          const w = ref.current.parentElement?.clientWidth || 320;
          g.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'en', width: Math.max(240, Math.min(360, w)) });
        }
      },
      (e: unknown) => setError(e instanceof Error ? e.message : 'Google sign-in unavailable'),
    );
    return () => {
      cancelled = true;
    };
  }, [clientId, compact]);

  return (
    <div className={compact ? 'gsi-compact' : 'gsi-wrap'}>
      <div ref={ref} className="gsi-button" />
      {error && <p className="muted small">{error}</p>}
    </div>
  );
}
