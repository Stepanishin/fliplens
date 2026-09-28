import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.js';
import { PrivacyPolicy, TermsOfService } from './screens/Legal.js';
import '@fontsource-variable/inter';
import './styles.css';
// Registers install listeners before React mounts: beforeinstallprompt can fire very early.
import './pwa.js';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/privacy' ? <PrivacyPolicy /> : window.location.pathname === '/terms' ? <TermsOfService /> : <App />}
  </StrictMode>,
);
