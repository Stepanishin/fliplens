import { useMemo } from 'react';
import { marketLinks } from './marketSearch.js';
import { tr } from './i18n.js';
import { track } from './track.js';

const T = tr({
  en: {
    title: 'Check prices yourself',
    opens: (q: string) => `Opens the marketplace search for “${q}”. These prices are not part of the estimate above.`,
    other: 'Other countries',
  },
  de: {
    title: 'Preise selbst prüfen',
    opens: (q: string) => `Öffnet die Suche nach „${q}“ auf dem Marktplatz. Diese Preise fließen nicht in die Schätzung oben ein.`,
    other: 'Andere Länder',
  },
});

export function MarketLinks({ query, country }: { query: string; country: string }) {
  const { local, other } = useMemo(() => marketLinks(query, country), [query, country]);
  if (!query.trim()) return null;

  return (
    <section className="card">
      <h2>{T.title}</h2>
      <p className="muted small">
        {T.opens(query.trim())}
      </p>
      <div className="links">
        {local.map((l) => (
          <a key={l.id} className={`link-btn ${l.id === 'vinted' ? 'featured' : ''}`} href={l.url} target="_blank" rel="noreferrer" onClick={() => track('market_link_opened', { marketplace: l.id })}>
            {l.name}
            {l.note && <span className="muted small">&nbsp;({l.note})</span>}
          </a>
        ))}
      </div>
      {other.length > 0 && (
        <details className="adv">
          <summary>{T.other}</summary>
          <div className="links">
            {other.map((l) => (
              <a key={l.id} className="link-btn" href={l.url} target="_blank" rel="noreferrer">
                {l.name}
              </a>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
