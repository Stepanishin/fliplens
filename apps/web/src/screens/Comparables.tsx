import { useMemo, useState } from 'react';
import type { ComparableJson } from '../api.js';
import { ago, CONDITION_LABEL, fmt, REASON_LABEL } from '../format.js';
import { tr } from '../i18n.js';
import { track } from '../track.js';

const T = tr({
  en: {
    show: (n: number) => `Show ${n} comparable listings`,
    ebay: 'eBay listings',
    comparables: 'Comparables',
    used: (n: number) => `${n} used for the estimate, cheapest first`,
    inYourCondition: (p: string) => `≈ ${p} in your condition`,
    condNa: 'condition n/a',
    listed: (age: string) => `listed ${age}`,
    match: (pct: number) => `match ${pct}%`,
    less: 'Show less',
    all: (n: number) => `Show all ${n}`,
    filtered: (n: number) => `Filtered out ${n}`,
  },
  de: {
    show: (n: number) => `${n} Vergleichsangebote anzeigen`,
    ebay: 'eBay-Angebote',
    comparables: 'Vergleichsangebote',
    used: (n: number) => `${n} für die Schätzung genutzt, günstigste zuerst`,
    inYourCondition: (p: string) => `≈ ${p} in deinem Zustand`,
    condNa: 'Zustand unbekannt',
    listed: (age: string) => `eingestellt ${age}`,
    match: (pct: number) => `Übereinstimmung ${pct} %`,
    less: 'Weniger anzeigen',
    all: (n: number) => `Alle ${n} anzeigen`,
    filtered: (n: number) => `${n} aussortiert`,
  },
  it: {
    show: (n: number) => `Mostra ${n} annunci comparabili`,
    ebay: 'Annunci eBay',
    comparables: 'Annunci comparabili',
    used: (n: number) => `${n} usati per la stima, dal più economico`,
    inYourCondition: (p: string) => `≈ ${p} nella tua condizione`,
    condNa: 'condizione n.d.',
    listed: (age: string) => `pubblicato ${age}`,
    match: (pct: number) => `corrispondenza ${pct} %`,
    less: 'Mostra meno',
    all: (n: number) => `Mostra tutti i ${n}`,
    filtered: (n: number) => `${n} esclusi`,
  },
  fr: {
    show: (n: number) => `Afficher ${n} annonces comparables`,
    ebay: 'Annonces eBay',
    comparables: 'Annonces comparables',
    used: (n: number) => `${n} utilisées pour l’estimation, les moins chères d’abord`,
    inYourCondition: (p: string) => `≈ ${p} dans ton état`,
    condNa: 'état inconnu',
    listed: (age: string) => `publiée ${age}`,
    match: (pct: number) => `correspondance ${pct} %`,
    less: 'Afficher moins',
    all: (n: number) => `Afficher les ${n}`,
    filtered: (n: number) => `${n} écartées`,
  },
});

/** "Why do we think it is worth €105": the listings the estimate is built from, and what was filtered out. */
export function Comparables({ items, defaultOpen = false }: { items: ComparableJson[]; defaultOpen?: boolean }) {
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
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? included : included.slice(0, defaultOpen ? 5 : 10);

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
        {T.show(included.length)}
      </button>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2>{defaultOpen ? T.ebay : T.comparables}</h2>
        <span className="muted small">{T.used(included.length)}</span>
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
                <span className="muted small">{T.inYourCondition(fmt(c.adjustedPrice))}</span>
              )}
            </div>
            <div className="comp-title">
              {c.item.url ? <a href={c.item.url} target="_blank" rel="noreferrer">{c.item.title}</a> : c.item.title}
            </div>
            <div className="muted small">
              {c.item.country ?? c.item.marketplaceSite} · {c.item.condition ? CONDITION_LABEL[c.item.condition] : T.condNa} · {T.listed(ago(c.item.listedAt ?? null))} · {T.match(Math.round(c.similarity * 100))}
            </div>
            </div>
          </li>
        ))}
      </ul>
      {included.length > (defaultOpen ? 5 : 10) && (
        <button
          type="button"
          className="ghost wide"
          onClick={() => {
            if (!showAll) track('comparables_opened', { count: included.length });
            setShowAll((s) => !s);
          }}
        >
          {showAll ? T.less : T.all(included.length)}
        </button>
      )}
      {excluded.length > 0 && (
        <details className="adv">
          <summary>{T.filtered(excluded.length)}: {byReason.slice(0, 4).map(([k, n]) => `${REASON_LABEL[k] ?? k} ${n}`).join(', ')}{byReason.length > 4 ? ', …' : ''}</summary>
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
