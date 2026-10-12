import type { JSX } from 'react';
import type { MarketActivityJson } from '../api.js';
import { money, tr } from '../i18n.js';
import { IconAlert, IconCheck, IconX } from './icons.js';

/** Shared result building blocks, used by the live Result and by saved scans. */

export type DecisionKey = 'strong_buy' | 'buy' | 'borderline' | 'skip';

const DECISION_TEXT: Record<DecisionKey, { title: string; sub: string }> = tr<Record<DecisionKey, { title: string; sub: string }>>({
  en: {
    strong_buy: { title: 'Strong buy', sub: 'Good margin and enough market data.' },
    buy: { title: 'Buy', sub: 'Profitable at this price.' },
    borderline: { title: 'Borderline', sub: 'Thin margin or uncertain data.' },
    skip: { title: 'Skip', sub: 'Not worth it at this price.' },
  },
  de: {
    strong_buy: { title: 'Klarer Kauf', sub: 'Gute Marge und genug Marktdaten.' },
    buy: { title: 'Kaufen', sub: 'Lohnt sich zu diesem Preis.' },
    borderline: { title: 'Grenzwertig', sub: 'Knappe Marge oder unsichere Daten.' },
    skip: { title: 'Finger weg', sub: 'Lohnt sich zu diesem Preis nicht.' },
  },
  it: {
    strong_buy: { title: 'Ottimo affare', sub: 'Buon margine e abbastanza dati di mercato.' },
    buy: { title: 'Compra', sub: 'Conviene a questo prezzo.' },
    borderline: { title: 'Al limite', sub: 'Margine ridotto o dati incerti.' },
    skip: { title: 'Lascia stare', sub: 'Non conviene a questo prezzo.' },
  },
  fr: {
    strong_buy: { title: 'Excellente affaire', sub: 'Bonne marge et assez de données de marché.' },
    buy: { title: 'Acheter', sub: 'Rentable à ce prix.' },
    borderline: { title: 'Limite', sub: 'Marge faible ou données incertaines.' },
    skip: { title: 'Passe ton chemin', sub: 'Pas rentable à ce prix.' },
  },
});

const T = tr({
  en: {
    worthUpTo: (p: string) => `Worth it up to ${p}`,
    profit: 'Profit',
    roi: 'ROI',
    na: 'n/a',
    sellsFor: 'Sells for',
    rangeLabel: (e: string, f: string, h: string, be: string | null) => `Expected sale ${e}, fast ${f}, high ${h}${be ? `, break-even ${be}` : ''}`,
    fastSale: 'Fast sale',
    expected: 'Expected',
    highAsk: 'High ask',
    breakEven: (p: string, below: boolean) => `Break-even at ${p}${below ? ', well below the market' : ''} · shaded: where most listings sit`,
    lots: 'Lots of',
    some: 'Some',
    few: 'Few',
    forSaleNow: 'For sale now',
    listingsIn: (level: string, n: number) => `${level} listings · ${n} countries`,
    typicalAge: 'Typical listing age',
    days: (n: number) => `${n} d`,
    noDates: 'no dates',
    stale: (pct: number) => `${pct}% listed 60+ days`,
    conf: (level: 'high' | 'medium' | 'low') => `${level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low'} confidence`,
  },
  de: {
    worthUpTo: (p: string) => `Lohnt sich bis ${p}`,
    profit: 'Gewinn',
    roi: 'ROI',
    na: 'n. v.',
    sellsFor: 'Verkauft für',
    rangeLabel: (e: string, f: string, h: string, be: string | null) => `Erwarteter Verkauf ${e}, schnell ${f}, hoch ${h}${be ? `, Gewinnschwelle ${be}` : ''}`,
    fastSale: 'Schnellverkauf',
    expected: 'Erwartet',
    highAsk: 'Hoher Angebotspreis',
    breakEven: (p: string, below: boolean) => `Gewinnschwelle bei ${p}${below ? ', weit unter dem Markt' : ''} · schattiert: dort liegen die meisten Angebote`,
    lots: 'Viele',
    some: 'Einige',
    few: 'Wenige',
    forSaleNow: 'Gerade im Angebot',
    listingsIn: (level: string, n: number) => `${level} Angebote · ${n} Länder`,
    typicalAge: 'Typisches Angebotsalter',
    days: (n: number) => `${n} T.`,
    noDates: 'keine Daten',
    stale: (pct: number) => `${pct} % seit 60+ Tagen online`,
    conf: (level: 'high' | 'medium' | 'low') => `${level === 'high' ? 'Hohe' : level === 'medium' ? 'Mittlere' : 'Geringe'} Sicherheit`,
  },
  it: {
    worthUpTo: (p: string) => `Conviene fino a ${p}`,
    profit: 'Profitto',
    roi: 'ROI',
    na: 'n.d.',
    sellsFor: 'Si vende a',
    rangeLabel: (e: string, f: string, h: string, be: string | null) => `Vendita prevista ${e}, rapida ${f}, alta ${h}${be ? `, pareggio ${be}` : ''}`,
    fastSale: 'Vendita rapida',
    expected: 'Prevista',
    highAsk: 'Prezzo richiesto alto',
    breakEven: (p: string, below: boolean) => `Pareggio a ${p}${below ? ', ben sotto il mercato' : ''} · zona ombreggiata: dove si trova la maggior parte degli annunci`,
    lots: 'Molti',
    some: 'Alcuni',
    few: 'Pochi',
    forSaleNow: 'In vendita ora',
    listingsIn: (level: string, n: number) => `${level} annunci · ${n} paesi`,
    typicalAge: 'Età tipica degli annunci',
    days: (n: number) => `${n} g`,
    noDates: 'nessuna data',
    stale: (pct: number) => `${pct}% online da 60+ giorni`,
    conf: (level: 'high' | 'medium' | 'low') => `Affidabilità ${level === 'high' ? 'alta' : level === 'medium' ? 'media' : 'bassa'}`,
  },
  fr: {
    worthUpTo: (p: string) => `Rentable jusqu’à ${p}`,
    profit: 'Bénéfice',
    roi: 'ROI',
    na: 'n/d',
    sellsFor: 'Se vend à',
    rangeLabel: (e: string, f: string, h: string, be: string | null) => `Vente prévue ${e}, rapide ${f}, haute ${h}${be ? `, seuil de rentabilité ${be}` : ''}`,
    fastSale: 'Vente rapide',
    expected: 'Prévu',
    highAsk: 'Prix demandé élevé',
    breakEven: (p: string, below: boolean) => `Seuil de rentabilité à ${p}${below ? ', bien en dessous du marché' : ''} · zone ombrée : là où se trouvent la plupart des annonces`,
    lots: 'Beaucoup d’annonces',
    some: 'Quelques annonces',
    few: 'Peu d’annonces',
    forSaleNow: 'En vente maintenant',
    listingsIn: (level: string, n: number) => `${level} · ${n} pays`,
    typicalAge: 'Âge typique des annonces',
    days: (n: number) => `${n} j`,
    noDates: 'pas de dates',
    stale: (pct: number) => `${pct} % en ligne depuis 60+ jours`,
    conf: (level: 'high' | 'medium' | 'low') => `Fiabilité ${level === 'high' ? 'élevée' : level === 'medium' ? 'moyenne' : 'faible'}`,
  },
});

const eur = (minor: number, digits = 0): string => money(minor, digits);

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
          <div className="hero-sub">{maxBuyMinor !== undefined ? T.worthUpTo(eur(maxBuyMinor)) : t.sub}</div>
        </div>
      </div>
      <div className="hero-numbers">
        <div>
          <span>{T.profit}</span>
          <strong>{profitMinor >= 0 ? '+' : '−'}{eur(Math.abs(profitMinor))}</strong>
        </div>
        <div>
          <span>{T.roi}</span>
          <strong>{roiPct === null ? T.na : `${Math.round(roiPct)}%`}</strong>
        </div>
        {expectedMinor !== undefined && (
          <div>
            <span>{T.sellsFor}</span>
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
  const label = T.rangeLabel(eur(expected), eur(fast), eur(high), breakEven !== undefined ? eur(breakEven) : null);
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
        <div><span>{T.fastSale}</span><strong>{eur(fast)}</strong></div>
        <div className="main"><span>{T.expected}</span><strong>{eur(expected)}</strong></div>
        <div><span>{T.highAsk}</span><strong>{eur(high)}</strong></div>
      </div>
      {breakEven !== undefined && (
        <p className="muted small">
          {beOnScale && <span className="legend-breakeven" />}
          {T.breakEven(eur(breakEven), !beOnScale)}
        </p>
      )}
    </div>
  );
}

export function MarketActivity({ m }: { m: MarketActivityJson }) {
  const level = m.activeListings >= 40 ? T.lots : m.activeListings >= 10 ? T.some : T.few;
  return (
    <div className="stat-grid">
      <div>
        <span>{T.forSaleNow}</span>
        <strong>{m.activeListings}</strong>
        <small>{T.listingsIn(level, m.countries)}</small>
      </div>
      <div>
        <span>{T.typicalAge}</span>
        <strong>{m.medianListingAgeDays === null ? T.na : T.days(m.medianListingAgeDays)}</strong>
        <small>{m.staleShare === null ? T.noDates : T.stale(Math.round(m.staleShare * 100))}</small>
      </div>
    </div>
  );
}

export function ConfidencePill({ level, score }: { level: 'high' | 'medium' | 'low'; score?: number }) {
  return (
    <span className={`conf-pill c-${level}`}>
      {T.conf(level)}{score !== undefined ? ` · ${Math.round(score * 100)}` : ''}
    </span>
  );
}

export { eur };
