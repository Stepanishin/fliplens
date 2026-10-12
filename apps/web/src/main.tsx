import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import { PrivacyPolicy, TermsOfService } from './screens/Legal.js';
import { DemoVideo } from './screens/DemoVideo.js';
import '@fontsource-variable/inter';
import './styles.css';
// Registers install listeners before React mounts: beforeinstallprompt can fire very early.
import './pwa.js';
import { track, trackVisit } from './track.js';

registerSW({ immediate: true });

// Back from connecting eBay in a popup (/?ebay=connected|declined|error): tell the opener and close.
const ebayResult = new URLSearchParams(window.location.search).get('ebay');
if (ebayResult && window.opener) {
  try {
    (window.opener as Window).postMessage({ ebay: ebayResult }, window.location.origin);
  } catch {
    // opener gone or cross-origin: nothing to tell
  }
  window.close();
}

trackVisit();
const legalPage = window.location.pathname === '/privacy' ? 'privacy' : window.location.pathname === '/terms' ? 'terms' : null;
if (legalPage) track('page_view', { page: legalPage });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/demo-video' ? <DemoVideo /> : window.location.pathname === '/privacy' ? <PrivacyPolicy /> : window.location.pathname === '/terms' ? <TermsOfService /> : <App />}
  </StrictMode>,
);
