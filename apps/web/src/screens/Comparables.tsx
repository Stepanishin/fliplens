import { useMemo, useState } from 'react';
import type { ComparableJson } from '../api.js';
import { ago, CONDITION_LABEL, fmt, REASON_LABEL } from '../format.js';
import { track } from '../track.js';

/** "Why do we think it is worth €105": the listings the estimate is built from, and what was filtered out. */
export function Comparables({ items }: { items: ComparableJson[] }) {
  const included = useMemo(
    () => items.filter((c) => c.included).sort((a, b) => (a.adjustedPrice?.amountMinor ?? 0) - (b.adjustedPrice?.amountMinor ?? 0)),
    [items],
  );
  const excluded = useMemo(() => items.filter((c) => !c.included), [items]);
  const byReason = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of excluded) {
      const k = c.exclusionReason ?? c.role;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [excluded]);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? included : included.slice(0, 10);

  if (!open) {
    return (
      <button
        type="button"
        className="ghost wide"
        onClick={() => {
          setOpen(true);
          track('comparables_opened', { count: included.length });
        }}
      >
        Show {included.length} comparable listings
      </button>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>Comparables</h2>
        <span className="muted small">eBay, cheapest first</span>
      </div>
      <ul className="list-card comps">
        {shown.map((c) => (
          <li key={`${c.item.source}:${c.item.externalId}`} className="comp with-thumb">
            {c.item.imageUrl ? (
              <img className="comp-thumb" src={c.item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="comp-thumb empty" aria-hidden="true" />
            )}
            <div className="comp-body">
            <div className="comp-price">
              <strong>{c.priceTarget ? fmt(c.priceTarget) : '?'}</strong>
              {c.adjustedPrice && c.priceTarget && c.adjustedPrice.amountMinor !== c.priceTarget.amountMinor && (
                <span className="muted small">≈ {fmt(c.adjustedPrice)} in your condition</span>
              )}
            </div>
            <div className="comp-title">
              {c.item.url ? <a href={c.item.url} target="_blank" rel="noreferrer">{c.item.title}</a> : c.item.title}
            </div>
            <div className="muted small">
              {c.item.country ?? c.item.marketplaceSite} · {c.item.condition ? CONDITION_LABEL[c.item.condition] : 'condition n/a'} · listed {ago(c.item.listedAt ?? null)} · match {Math.round(c.similarity * 100)}%
            </div>
            </div>
          </li>
        ))}
      </ul>
      {included.length > 10 && (
        <button type="button" className="ghost wide" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show less' : `Show all ${included.length}`}
        </button>
      )}
      {excluded.length > 0 && (
        <details className="adv">
          <summary>Filtered out {excluded.length}: {byReason.slice(0, 4).map(([k, n]) => `${REASON_LABEL[k] ?? k} ${n}`).join(', ')}{byReason.length > 4 ? ', …' : ''}</summary>
          <ul className="list-card comps excluded">
            {excluded.slice(0, 80).map((c) => (
              <li key={`${c.item.source}:${c.item.externalId}`} className="comp">
                <div className="comp-price">
                  <span>{fmt(c.priceTarget ?? c.item.price)}</span>
                  <span className="pill soft">{REASON_LABEL[c.exclusionReason ?? ''] ?? c.role}{c.exclusionDetail ? `: ${c.exclusionDetail}` : ''}</span>
                </div>
                <div className="comp-title">{c.item.title}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
