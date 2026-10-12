import { useEffect, useState } from 'react';
import { api, type ServerScan, type StoredValuation } from '../api.js';
import { CONDITION_LABEL, REASON_LABEL, scanPill } from '../format.js';
import { ago, money, reason, tr } from '../i18n.js';
import { ConfidencePill, DecisionHero, MarketActivity } from '../ui/verdict.js';

const eur = (minor: number): string => money(minor);

const T = tr({
  en: {
    history: 'History',
    needsDb: 'History needs the server database (DATABASE_URL).',
    empty: 'No scans yet. Your checks show up here.',
    noPrice: 'no price',
    buy: (p: string) => `buy ${p}`,
    profit: (p: string) => ` · profit ${p}`,
    maxBuy: (p: string) => `max buy ${p}`,
    boughtAt: (p: string) => `bought at ${p}`,
    loading: 'Loading…',
    loadFail: 'Could not load this scan.',
    valueThen: 'Resale value then',
    fast: 'Fast',
    expected: 'Expected',
    high: 'High ask',
    maxBuyPrice: 'Max buy price',
    used: (i: number, f: number) => `${i} of ${f} listings used`,
    marketThen: 'Market then',
    why: 'Why',
    risks: 'Risks',
    noData: 'Not enough market data',
    filtered: 'Filtered out:',
    noneFound: 'no listings found',
    notStored: "Individual eBay listings are not stored (eBay license), re-check to see today's comparables.",
    del: 'Delete',
    recheck: 'Re-check market now',
  },
  de: {
    history: 'Verlauf',
    needsDb: 'Der Verlauf braucht die Server-Datenbank (DATABASE_URL).',
    empty: 'Noch keine Scans. Deine Checks erscheinen hier.',
    noPrice: 'kein Preis',
    buy: (p: string) => `Kauf ${p}`,
    profit: (p: string) => ` · Gewinn ${p}`,
    maxBuy: (p: string) => `Höchstpreis ${p}`,
    boughtAt: (p: string) => `gekauft für ${p}`,
    loading: 'Wird geladen…',
    loadFail: 'Dieser Scan konnte nicht geladen werden.',
    valueThen: 'Wiederverkaufswert damals',
    fast: 'Schnell',
    expected: 'Erwartet',
    high: 'Hoch',
    maxBuyPrice: 'Höchstpreis',
    used: (i: number, f: number) => `${i} von ${f} Angeboten genutzt`,
    marketThen: 'Markt damals',
    why: 'Warum',
    risks: 'Risiken',
    noData: 'Nicht genug Marktdaten',
    filtered: 'Aussortiert:',
    noneFound: 'keine Angebote gefunden',
    notStored: 'Einzelne eBay-Angebote werden nicht gespeichert (eBay-Lizenz). Prüf erneut, um die heutigen Vergleichsangebote zu sehen.',
    del: 'Löschen',
    recheck: 'Markt jetzt neu prüfen',
  },
  it: {
    history: 'Cronologia',
    needsDb: 'La cronologia richiede il database del server (DATABASE_URL).',
    empty: 'Ancora nessuna scansione. I tuoi controlli appariranno qui.',
    noPrice: 'nessun prezzo',
    buy: (p: string) => `acquisto ${p}`,
    profit: (p: string) => ` · profitto ${p}`,
    maxBuy: (p: string) => `prezzo massimo ${p}`,
    boughtAt: (p: string) => `comprato a ${p}`,
    loading: 'Caricamento…',
    loadFail: 'Impossibile caricare questa scansione.',
    valueThen: 'Valore di rivendita allora',
    fast: 'Rapida',
    expected: 'Prevista',
    high: 'Prezzo alto',
    maxBuyPrice: 'Prezzo massimo',
    used: (i: number, f: number) => `${i} annunci usati su ${f}`,
    marketThen: 'Mercato allora',
    why: 'Perché',
    risks: 'Rischi',
    noData: 'Dati di mercato insufficienti',
    filtered: 'Esclusi:',
    noneFound: 'nessun annuncio trovato',
    notStored: 'I singoli annunci eBay non vengono salvati (licenza eBay). Ricontrolla per vedere gli annunci comparabili di oggi.',
    del: 'Elimina',
    recheck: 'Ricontrolla il mercato ora',
  },
  fr: {
    history: 'Historique',
    needsDb: 'L’historique nécessite la base de données du serveur (DATABASE_URL).',
    empty: 'Aucun scan pour l’instant. Tes vérifications apparaîtront ici.',
    noPrice: 'pas de prix',
    buy: (p: string) => `achat ${p}`,
    profit: (p: string) => ` · bénéfice ${p}`,
    maxBuy: (p: string) => `prix maximum ${p}`,
    boughtAt: (p: string) => `acheté ${p}`,
    loading: 'Chargement…',
    loadFail: 'Impossible de charger ce scan.',
    valueThen: 'Valeur de revente à l’époque',
    fast: 'Rapide',
    expected: 'Prévu',
    high: 'Prix élevé',
    maxBuyPrice: 'Prix maximum',
    used: (i: number, f: number) => `${i} annonces utilisées sur ${f}`,
    marketThen: 'Marché à l’époque',
    why: 'Pourquoi',
    risks: 'Risques',
    noData: 'Pas assez de données de marché',
    filtered: 'Écartées :',
    noneFound: 'aucune annonce trouvée',
    notStored: 'Les annonces eBay individuelles ne sont pas conservées (licence eBay). Relance la vérification pour voir les annonces comparables du jour.',
    del: 'Supprimer',
    recheck: 'Revérifier le marché maintenant',
  },
});
import { IconChevron, IconRefresh } from '../ui/icons.js';

export function History({ scans, dbOn, onOpen }: { scans: ServerScan[] | null; dbOn: boolean; onOpen: (s: ServerScan) => void }) {
  if (!dbOn) {
    return (
      <div className="screen">
        <h1 className="screen-title">{T.history}</h1>
        <div className="empty">{T.needsDb}</div>
      </div>
    );
  }
  return (
    <div className="screen">
      <h1 className="screen-title">{T.history}</h1>
      {scans === null ? (
        <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
      ) : scans.length === 0 ? (
        <div className="empty">{T.empty}</div>
      ) : (
        <ul className="list-card">
          {scans.map((s) => (
            <li key={s.id}>
              <button type="button" className="list-row" onClick={() => onOpen(s)}>
                <span className="list-main">
                  <strong>{s.product.brand} {s.product.model} {s.product.capacity ?? ''}</strong>
                  <span className="muted small">
                    {s.priceProvided === false ? T.noPrice : T.buy(eur(s.purchasePrice.amountMinor))}
                    {s.priceProvided !== false && s.valuation?.profit !== null && s.valuation?.profit !== undefined ? T.profit(eur(s.valuation.profit)) : ''} · {ago(s.createdAt)}
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
        <span className="muted small">{CONDITION_LABEL[scan.condition]} · {scan.priceProvided === false ? T.maxBuy(eur(scan.purchasePrice.amountMinor)) : T.boughtAt(eur(scan.purchasePrice.amountMinor))} · {ago(scan.createdAt)}</span>
      </div>

      {v === undefined && <div className="identifying"><span className="spinner" /> {T.loading}</div>}
      {v === null && <div className="banner bad">{T.loadFail}</div>}

      {v && v.status === 'ok' && v.decision && v.expectedProfitMinor !== null && (
        <>
          <DecisionHero decision={v.decision} profitMinor={v.expectedProfitMinor} roiPct={v.roiBp === null ? null : v.roiBp / 100} {...(v.expectedSaleMinor !== null && { expectedMinor: v.expectedSaleMinor })} {...(v.maxBuyMinor !== null && { maxBuyMinor: v.maxBuyMinor })} />
          <section className="card">
            <div className="card-head">
              <h2>{T.valueThen}</h2>
              {v.confidenceLevel && <ConfidencePill level={v.confidenceLevel} />}
            </div>
            <div className="triple">
              <div><span>{T.fast}</span><strong>{eur(v.fastSaleMinor ?? 0)}</strong></div>
              <div className="main"><span>{T.expected}</span><strong>{eur(v.expectedSaleMinor ?? 0)}</strong></div>
              <div><span>{T.high}</span><strong>{eur(v.highSaleMinor ?? 0)}</strong></div>
            </div>
            {v.maxBuyMinor !== null && <div className="maxbuy"><span>{T.maxBuyPrice}</span><strong>{eur(v.maxBuyMinor)}</strong></div>}
            <p className="muted small">
              {T.used(v.includedCount, v.fetchedCount)} · {v.pricingAlgorithmVersion} · {v.feeProfileId}
            </p>
          </section>
          {v.market && (
            <section className="card">
              <h2>{T.marketThen}</h2>
              <MarketActivity m={v.market} />
            </section>
          )}
          {v.decisionFactors && (
            <section className="card">
              <h2>{T.why}</h2>
              <ul className="list">{v.decisionFactors.map((f) => <li key={f}>{reason(f)}</li>)}</ul>
              {v.risks && v.risks.length > 0 && (
                <>
                  <h3>{T.risks}</h3>
                  <ul className="list risks">{v.risks.map((f) => <li key={f}>{reason(f)}</li>)}</ul>
                </>
              )}
            </section>
          )}
        </>
      )}
      {v && v.status === 'insufficient_data' && (
        <div className="hero d-insufficient">
          <div className="hero-title">{T.noData}</div>
          <div className="hero-sub">
            {T.filtered} {Object.entries(v.exclusionCounts).map(([k, n]) => `${REASON_LABEL[k] ?? k} ${n}`).join(', ') || T.noneFound}
          </div>
        </div>
      )}

      <p className="muted small center">{T.notStored}</p>
      <div className="actions">
        <button type="button" className="ghost danger" onClick={onDelete}>{T.del}</button>
        <button type="button" className="primary" onClick={onRecheck}><IconRefresh size={18} /> {T.recheck}</button>
      </div>
    </div>
  );
}
