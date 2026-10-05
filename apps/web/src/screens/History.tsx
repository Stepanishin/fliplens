import { useEffect, useState } from 'react';
import { api, type ServerScan, type StoredValuation } from '../api.js';
import { ago, CONDITION_LABEL, DECISION_LABEL, REASON_LABEL, scanPill } from '../format.js';
import { ConfidencePill, DecisionHero, eur, MarketActivity } from '../ui/verdict.js';
import { IconChevron, IconRefresh } from '../ui/icons.js';

export function History({ scans, dbOn, onOpen }: { scans: ServerScan[] | null; dbOn: boolean; onOpen: (s: ServerScan) => void }) {
  if (!dbOn) {
    return (
      <div className="screen">
        <h1 className="screen-title">History</h1>
        <div className="empty">History needs the server database (DATABASE_URL).</div>
      </div>
    );
  }
  return (
    <div className="screen">
      <h1 className="screen-title">History</h1>
      {scans === null ? (
        <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      ) : scans.length === 0 ? (
        <div className="empty">No scans yet. Your checks show up here.</div>
      ) : (
        <ul className="list-card">
          {scans.map((s) => (
            <li key={s.id}>
              <button type="button" className="list-row" onClick={() => onOpen(s)}>
                <span className="list-main">
                  <strong>{s.product.brand} {s.product.model} {s.product.capacity ?? ''}</strong>
                  <span className="muted small">
                    {s.priceProvided === false ? 'no price' : `buy €${s.purchasePrice.amountMinor / 100}`}
                    {s.priceProvided !== false && s.valuation?.profit !== null && s.valuation?.profit !== undefined ? ` · profit ${eur(s.valuation.profit)}` : ''} · {ago(s.createdAt)}
                  </span>
                </span>
                <span className={`pill ${scanPill(s).cls}`}>{scanPill(s).label}</span>
                <IconChevron size={18} className="muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A saved scan as it was valued then (aggregates only), with a one-tap re-check against today's market. */
export function ScanDetail({ scan, onRecheck, onDelete }: { scan: ServerScan; onRecheck: () => void; onDelete: () => void }) {
  const [v, setV] = useState<StoredValuation | null | undefined>(undefined);
  useEffect(() => {
    api.scan(scan.id).then((r) => setV(r.valuation), () => setV(null));
  }, [scan.id]);

  const p = scan.product;
  return (
    <div className="screen">
      <div className="summary-chip">
        <strong>{p.brand} {p.model}{p.capacity ? ` ${p.capacity}` : ''}</strong>
        <span className="muted small">{CONDITION_LABEL[scan.condition]} · {scan.priceProvided === false ? `max buy €${scan.purchasePrice.amountMinor / 100}` : `bought at €${scan.purchasePrice.amountMinor / 100}`} · {ago(scan.createdAt)}</span>
      </div>

      {v === undefined && <div className="identifying"><span className="spinner" /> Loading…</div>}
      {v === null && <div className="banner bad">Could not load this scan.</div>}

      {v && v.status === 'ok' && v.decision && v.expectedProfitMinor !== null && (
        <>
          <DecisionHero decision={v.decision} profitMinor={v.expectedProfitMinor} roiPct={v.roiBp === null ? null : v.roiBp / 100} {...(v.expectedSaleMinor !== null && { expectedMinor: v.expectedSaleMinor })} {...(v.maxBuyMinor !== null && { maxBuyMinor: v.maxBuyMinor })} />
          <section className="card">
            <div className="card-head">
              <h2>Resale value then</h2>
              {v.confidenceLevel && <ConfidencePill level={v.confidenceLevel} />}
            </div>
            <div className="triple">
              <div><span>Fast</span><strong>{eur(v.fastSaleMinor ?? 0)}</strong></div>
              <div className="main"><span>Expected</span><strong>{eur(v.expectedSaleMinor ?? 0)}</strong></div>
              <div><span>High ask</span><strong>{eur(v.highSaleMinor ?? 0)}</strong></div>
            </div>
            {v.maxBuyMinor !== null && <div className="maxbuy"><span>Max buy price</span><strong>{eur(v.maxBuyMinor)}</strong></div>}
            <p className="muted small">
              {v.includedCount} of {v.fetchedCount} listings used · {v.pricingAlgorithmVersion} · {v.feeProfileId}
            </p>
          </section>
          {v.market && (
            <section className="card">
              <h2>Market then</h2>
              <MarketActivity m={v.market} />
            </section>
          )}
          {v.decisionFactors && (
            <section className="card">
              <h2>Why</h2>
              <ul className="list">{v.decisionFactors.map((f) => <li key={f}>{f}</li>)}</ul>
              {v.risks && v.risks.length > 0 && (
                <>
                  <h3>Risks</h3>
                  <ul className="list risks">{v.risks.map((f) => <li key={f}>{f}</li>)}</ul>
                </>
              )}
            </section>
          )}
        </>
      )}
      {v && v.status === 'insufficient_data' && (
        <div className="hero d-insufficient">
          <div className="hero-title">Not enough market data</div>
          <div className="hero-sub">
            Filtered out: {Object.entries(v.exclusionCounts).map(([k, n]) => `${REASON_LABEL[k] ?? k} ${n}`).join(', ') || 'no listings found'}
          </div>
        </div>
      )}

      <p className="muted small center">Individual eBay listings are not stored (eBay license), re-check to see today's comparables.</p>
      <div className="actions">
        <button type="button" className="ghost danger" onClick={onDelete}>Delete</button>
        <button type="button" className="primary" onClick={onRecheck}><IconRefresh size={18} /> Re-check market now</button>
      </div>
    </div>
  );
}
