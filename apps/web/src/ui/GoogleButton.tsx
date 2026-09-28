import { useEffect, useRef, useState } from 'react';

/** "Sign in with Google" via Google Identity Services. Returns an ID token (credential) to verify on the server. */

interface GsiButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'continue_with';
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

export function GoogleButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGsi().then(
      (g) => {
        if (cancelled || !ref.current) return;
        g.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential), ux_mode: 'popup' });
        g.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'en', width: Math.min(360, ref.current.clientWidth || 320) });
      },
      (e: unknown) => setError(e instanceof Error ? e.message : 'Google sign-in unavailable'),
    );
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div>
      <div ref={ref} className="gsi-button" />
      {error && <p className="muted small">{error}</p>}
    </div>
  );
}
