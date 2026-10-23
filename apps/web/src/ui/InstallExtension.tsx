import { useEffect, useState } from 'react';
import { EXTENSION_URL, canInstallExtension, extensionInstalled } from '../extension.js';
import { tr } from '../i18n.js';
import { track } from '../track.js';

const T = tr({
  en: { title: 'Browser extension', sub: 'Check listings on Vinted, eBay and other marketplaces right on the page.', add: 'Add to Chrome' },
  de: { title: 'Browser-Erweiterung', sub: 'Prüfe Angebote auf Vinted, eBay und anderen Marktplätzen direkt auf der Seite.', add: 'Zu Chrome hinzufügen' },
  it: { title: 'Estensione del browser', sub: 'Verifica gli annunci su Vinted, eBay e altri marketplace direttamente nella pagina.', add: 'Aggiungi a Chrome' },
  fr: { title: 'Extension de navigateur', sub: 'Vérifie les annonces sur Vinted, eBay et d’autres places de marché directement sur la page.', add: 'Ajouter à Chrome' },
});

/** Profile row offering the browser extension, on desktop Chromium browsers that do not have it yet. */
export function InstallExtension() {
  const [installed, setInstalled] = useState(extensionInstalled);
  // The extension marks the page once its script has run (document_idle), which can be after the first render.
  useEffect(() => {
    if (installed) return;
    const id = setTimeout(() => setInstalled(extensionInstalled()), 1500);
    return () => clearTimeout(id);
  }, [installed]);

  if (installed || !canInstallExtension()) return null;
  return (
    <section className="card">
      <div className="card-head">
        <span>
          <strong>{T.title}</strong>
          <br />
          <span className="muted small">{T.sub}</span>
        </span>
        <a className="ghost" style={{ flex: '0 0 auto' }} href={EXTENSION_URL} target="_blank" rel="noopener" onClick={() => track('extension_install_clicked', { from: 'profile' })}>
          {T.add}
        </a>
      </div>
    </section>
  );
}
