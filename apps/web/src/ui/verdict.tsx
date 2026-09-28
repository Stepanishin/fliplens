import type { JSX } from 'react';
import type { MarketActivityJson } from '../api.js';
import { IconAlert, IconCheck, IconX } from './icons.js';

/** Shared result building blocks, used by the live Result and by saved scans. */

export type DecisionKey = 'strong_buy' | 'buy' | 'borderline' | 'skip';

const DECISION_TEXT: Record<DecisionKey, { title: string; sub: string }> = {
  strong_buy: { title: 'Strong buy', sub: 'Good margin and enough market data.' },
  buy: { title: 'Buy', sub: 'Profitable at this price.' },
  borderline: { title: 'Borderline', sub: 'Thin margin or uncertain data.' },
  skip: { title: 'Skip', sub: 'Not worth it at this price.' },
};

const eur = (minor: number, digits = 0): string =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / 100);

const DECISION_ICON: Record<DecisionKey, (p: { size?: number }) => JSX.Element> = {
  strong_buy: IconCheck,
  buy: IconCheck,
  borderline: IconAlert,
  skip: IconX,
};

export function DecisionHero({
  decision,
  profitMinor,
  roiPct,
  expectedMinor,
  maxBuyMinor,
}: {
  decision: DecisionKey;
  profitMinor: number;
  roiPct: number | null;
  expectedMinor?: number;
  maxBuyMinor?: number;
}) {
  const t = DECISION_TEXT[decision];
  const Icon = DECISION_ICON[decision];
  return (
    <div className={`hero d-${decision}`}>
      <div className="hero-top">
        <span className="hero-icon"><Icon size={26} /></span>
        <div>
          <div className="hero-title">{t.title}</div>
          <div className="hero-sub">{maxBuyMinor !== undefined ? `Worth it up to ${eur(maxBuyMinor)}` : t.sub}</div>
        </div>
      </div>
      <div className="hero-numbers">
        <div>
          <span>Profit</span>
          <strong>{profitMinor >= 0 ? '+' : '−'}{eur(Math.abs(profitMinor))}</strong>
        </div>
        <div>
          <span>ROI</span>
          <strong>{roiPct === null ? 'n/a' : `${Math.round(roiPct)}%`}</strong>
        </div>
        {expectedMinor !== undefined && (
          <div>
            <span>Sells for</span>
            <strong>{eur(expectedMinor)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

interface RangeProps {
  /** Condition-adjusted listing prices: p10..p90 and the p25..p75 band. */
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  fast: number;
  expected: number;
  high: number;
  /** Sale price at which profit is 0. */
  breakEven?: number;
}

/** Horizontal price scale: where the market is, where our estimate is, and where you stop making money. */
export function RangeBar({ p10, p25, p75, p90, fast, expected, high, breakEven }: RangeProps) {
  const marketLo = Math.min(p10, fast);
  const marketHi = Math.max(p90, high);
  // Show break-even on the scale only when it is near the market; far below it would squash the bar.
  const beOnScale = breakEven !== undefined && breakEven >= marketLo * 0.7;
  const lo = Math.min(marketLo, beOnScale ? breakEven : marketLo) * 0.95;
  const hi = marketHi * 1.03;
  const x = (v: number): string => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`;
  const label = `Expected sale ${eur(expected)}, fast ${eur(fast)}, high ${eur(high)}${breakEven !== undefined ? `, break-even ${eur(breakEven)}` : ''}`;
  return (
    <div className="range-bar" role="img" aria-label={label}>
      <div className="range-track">
        <div className="range-spread" style={{ left: x(p10), width: `calc(${x(p90)} - ${x(p10)})` }} />
        <div className="range-band" style={{ left: x(p25), width: `calc(${x(p75)} - ${x(p25)})` }} />
        {beOnScale && <div className="range-breakeven" style={{ left: x(breakEven) }} />}
        <div className="range-tick" style={{ left: x(fast) }} />
        <div className="range-tick" style={{ left: x(high) }} />
        <div className="range-dot" style={{ left: x(expected) }} />
      </div>
      <div className="triple">
        <div><span>Fast sale</span><strong>{eur(fast)}</strong></div>
        <div className="main"><span>Expected</span><strong>{eur(expected)}</strong></div>
        <div><span>High ask</span><strong>{eur(high)}</strong></div>
      </div>
      {breakEven !== undefined && (
        <p className="muted small">
          {beOnScale && <span className="legend-breakeven" />}
          Break-even at {eur(breakEven)}{beOnScale ? '' : ', well below the market'} · shaded: where most listings sit
        </p>
      )}
    </div>
  );
}

export function MarketActivity({ m }: { m: MarketActivityJson }) {
  const level = m.activeListings >= 40 ? 'Lots of' : m.activeListings >= 10 ? 'Some' : 'Few';
  return (
    <div className="stat-grid">
      <div>
        <span>For sale now</span>
        <strong>{m.activeListings}</strong>
        <small>{level} listings · {m.countries} countries</small>
      </div>
      <div>
        <span>Typical listing age</span>
        <strong>{m.medianListingAgeDays === null ? 'n/a' : `${m.medianListingAgeDays} d`}</strong>
        <small>{m.staleShare === null ? 'no dates' : `${Math.round(m.staleShare * 100)}% listed 60+ days`}</small>
      </div>
    </div>
  );
}

export function ConfidencePill({ level, score }: { level: 'high' | 'medium' | 'low'; score?: number }) {
  return (
    <span className={`conf-pill c-${level}`}>
      {level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low'} confidence{score !== undefined ? ` · ${Math.round(score * 100)}` : ''}
    </span>
  );
}

export { eur };
