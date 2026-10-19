import { useState } from 'react';
import { tr } from '../i18n.js';
import { applyUpdate, useUpdateReady } from '../pwa-update.js';

const T = tr({
  en: { text: 'A new version of FlipLens is ready.', reload: 'Reload', later: 'Later' },
  de: { text: 'Eine neue Version von FlipLens ist bereit.', reload: 'Neu laden', later: 'Später' },
  it: { text: 'È pronta una nuova versione di FlipLens.', reload: 'Ricarica', later: 'Più tardi' },
  fr: { text: 'Une nouvelle version de FlipLens est prête.', reload: 'Recharger', later: 'Plus tard' },
});

/** Offers the reload instead of forcing it, so a check in progress is never lost. */
export function UpdateBanner() {
  const ready = useUpdateReady();
  const [hidden, setHidden] = useState(false);
  if (!ready || hidden) return null;
  return (
    <div className="update-banner" role="status">
      <span>{T.text}</span>
      <button type="button" className="link" onClick={applyUpdate}>{T.reload}</button>
      <button type="button" className="link muted" onClick={() => setHidden(true)}>{T.later}</button>
    </div>
  );
}
