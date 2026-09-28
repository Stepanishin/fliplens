import { useEffect, useState } from 'react';
import { track } from './track.js';

/**
 * "Install app" support. Chromium browsers (Android, desktop Chrome/Edge) fire `beforeinstallprompt` when the PWA is
 * installable (HTTPS + manifest + service worker); we keep that event and show our own button. iOS Safari has no such
 * API: installing is Share > Add to Home Screen, so we show instructions instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // keep it for our own button instead of the browser's mini-infobar
  deferred = e as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  track('app_installed', {});
  notify();
});

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export type InstallMode = 'prompt' | 'ios' | 'none';

export function usePwaInstall(): { mode: InstallMode; install: () => Promise<boolean> } {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const mode: InstallMode = isStandalone() ? 'none' : deferred ? 'prompt' : isIosSafari() ? 'ios' : 'none';

  async function install(): Promise<boolean> {
    if (!deferred) return false;
    const e = deferred;
    await e.prompt();
    const { outcome } = await e.userChoice;
    track('app_install_prompt', { outcome });
    if (outcome === 'accepted') deferred = null;
    notify();
    return outcome === 'accepted';
  }

  return { mode, install };
}
