import { useMemo } from 'react';
import { marketLinks } from './marketSearch.js';
import { track } from './track.js';

export function MarketLinks({ query, country }: { query: string; country: string }) {
  const { local, other } = useMemo(() => marketLinks(query, country), [query, country]);
  if (!query.trim()) return null;

  return (
    <section className="card">
      <h2>Check prices yourself</h2>
      <p className="muted small">
        Opens the marketplace search for “{query.trim()}”. These prices are not part of the estimate above.
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
          <summary>Other countries</summary>
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
