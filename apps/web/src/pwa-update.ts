import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { track } from './track.js';

/**
 * App updates without surprise reloads. With `autoUpdate` the service worker reloaded the page a few seconds after
 * opening whenever a deploy had happened, often while the user was already tapping around (or mid-scan).
 * Now a new version waits. If it was already downloaded during an earlier visit, we switch to it as the page opens
 * (a fraction of a second, before anything is shown for long); a version found while the app is open only shows a
 * small banner that offers the reload. Without a tap it is used on the next start.
 */

let ready = false;
const listeners = new Set<() => void>();

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration?.waiting && navigator.serviceWorker.controller) {
      track('app_updated', { when: 'start' });
      void updateSW(true);
    }
  },
  onNeedRefresh() {
    ready = true;
    listeners.forEach((l) => l());
  },
});

export function applyUpdate(): void {
  track('app_updated', { when: 'banner' });
  void updateSW(true);
}

/** True once a new version is waiting for the user's reload. */
export function useUpdateReady(): boolean {
  const [r, setR] = useState(ready);
  useEffect(() => {
    const l = () => setR(true);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return r;
}
