import type { ReactNode } from 'react';
import type { ValuationResponse } from '../api.js';
import { ago, FACTOR_LABEL } from '../format.js';
import { MarketLinks } from '../MarketLinks.js';
import { ConfidencePill, DecisionHero, eur, MarketActivity, RangeBar } from '../ui/verdict.js';
import { IconEdit, IconScan } from '../ui/icons.js';
import { Comparables } from './Comparables.js';

interface Props {
  resp: ValuationResponse;
  query: string;
  country: string;
  onNewScan: () => void;
  onEdit: () => void;
  targetRoiPct: number;
  children?: ReactNode;
}

export function Result({ resp, query, country, onNewScan, onEdit, targetRoiPct, children }: Props) {
  const r = resp.result;

  if (r.status === 'insufficient_data') {
    return (
      <div className="screen">
        <div className="hero d-insufficient">
          <div className="hero-title">Not enough market data</div>
          <div className="hero-sub">
            {r.reason === 'too_few_comparables'
              ? `Only ${r.includedCount} matching listings after filtering (5 needed). We don't guess.`
              : 'The product identification is too uncertain to value.'}
          </div>
        </div>
        <section className="card">
          <h2>What you can do</h2>
          <ul className="list">
            <li>Check the model name, storage and mount: a wrong detail hides the market.</li>
            <li>Scan the barcode on the box, or add a photo of the label.</li>
            <li>Look it up yourself with the links below.</li>
          </ul>
        </section>
        <MarketLinks query={query} country={country} />
        <Comparables items={r.comparables} />
        <Actions onNewScan={onNewScan} onEdit={onEdit} />
        {children}
      </div>
    );
  }

  const e = r.estimate;
  const p = r.profit.expected;
  const d = e.distribution;
  const fee = resp.feePreset;
  const shipping = p.shipping.amountMinor;
  // Sale price where profit hits 0: S - (S * fee% + fixed) - shipping = purchase.
  const breakEven = Math.round((p.purchasePrice.amountMinor + fee.fixedFeeMinor + shipping + p.packaging.amountMinor) / (1 - fee.percentageFeeBp / 10_000));

  return (
    <div className="screen">
      {resp.sourceWarnings.map((w, i) => (
        <div key={i} className="banner warn small">{w.site ? `${w.site}: ` : ''}{w.message}</div>
      ))}

      <DecisionHero decision={r.decision.decision} profitMinor={p.profit.amountMinor} roiPct={p.roiPct} expectedMinor={e.expected.amountMinor} {...(r.maxBuyPrice && { maxBuyMinor: r.maxBuyPrice.amountMinor })} />

      <section className="card">
        <div className="card-head">
          <h2>Resale value</h2>
          <ConfidencePill level={e.confidence.level} score={e.confidence.score} />
        </div>
        <RangeBar
          p10={d.p10}
          p25={d.p25}
          p75={d.p75}
          p90={d.p90}
          fast={e.fast.amountMinor}
          expected={e.expected.amountMinor}
          high={e.high.amountMinor}
          breakEven={breakEven}
        />
        {r.maxBuyPrice && (
          <div className="maxbuy">
            <span>Max buy price for {targetRoiPct}% ROI</span>
            <strong>{eur(r.maxBuyPrice.amountMinor)}</strong>
          </div>
        )}
        <p className="muted small">
          Based on {d.count} {e.dataKind === 'sold' ? 'sold items' : 'active eBay listings (asking prices, adjusted down)'} · data {ago(resp.dataFetchedAt)}
        </p>
      </section>

      <section className="card">
        <h2>Why</h2>
        <ul className="list">{r.decision.factors.map((f) => <li key={f}>{f}</li>)}</ul>
        {r.decision.risks.length > 0 && (
          <>
            <h3>Risks</h3>
            <ul className="list risks">{r.decision.risks.map((f) => <li key={f}>{f}</li>)}</ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Market</h2>
        <MarketActivity m={e.market} />
        <p className="muted small">Supply only: we can't see how fast items actually sell yet.</p>
      </section>

      <section className="card">
        <details className="adv flat">
          <summary>
            <span>Money breakdown</span>
            <span className="muted">net {eur(p.net.amountMinor, 2)}</span>
          </summary>
          <table className="breakdown">
            <tbody>
              <tr><td>Expected sale</td><td>{eur(p.salePrice.amountMinor, 2)}</td></tr>
              <tr><td>Marketplace fee ({fee.percentageFeeBp / 100}%{fee.fixedFeeMinor ? ` + ${eur(fee.fixedFeeMinor, 2)}` : ''})</td><td>−{eur(p.marketplaceFee.amountMinor + p.paymentFee.amountMinor, 2)}</td></tr>
              <tr><td>Shipping</td><td>−{eur(shipping, 2)}</td></tr>
              <tr className="sum"><td>Net</td><td>{eur(p.net.amountMinor, 2)}</td></tr>
              <tr><td>Purchase</td><td>−{eur(p.purchasePrice.amountMinor, 2)}</td></tr>
              <tr className="sum"><td>Profit</td><td>{eur(p.profit.amountMinor, 2)}</td></tr>
            </tbody>
          </table>
          <p className="muted small">
            {fee.label}: {fee.profileId}, checked {fee.lastVerifiedAt}{fee.sourceQuality === 'secondary' ? ' (secondary source)' : ''}.
          </p>
        </details>
        <details className="adv flat">
          <summary>
            <span>Confidence details</span>
            <span className="muted">{Math.round(e.confidence.score * 100)} / 100</span>
          </summary>
          <ul className="factors">
            {e.confidence.factors.map((f) => (
              <li key={f.name}>
                <span>{FACTOR_LABEL[f.name] ?? f.name}</span>
                <meter min={0} max={1} value={f.value} />
                <span className="small">{f.value.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">{r.pricingAlgorithmVersion} · FX {resp.fx.source.toUpperCase()} {resp.fx.rateDate}</p>
        </details>
      </section>

      <Comparables items={e.comparables} />
      <MarketLinks query={query} country={country} />
      <Actions onNewScan={onNewScan} onEdit={onEdit} />
      {children}
    </div>
  );
}

function Actions({ onNewScan, onEdit }: { onNewScan: () => void; onEdit: () => void }) {
  return (
    <div className="actions">
      <button type="button" className="ghost" onClick={onEdit}><IconEdit size={18} /> Edit</button>
      <button type="button" className="primary" onClick={onNewScan}><IconScan size={20} /> New scan</button>
    </div>
  );
}
