import { useState } from 'react';
import { api, type MarketCompare as Compare } from '../api.js';
import { errorText, LOCALE, money, tr, userCurrency } from '../i18n.js';
import { loadSettings } from '../storage.js';
import { track } from '../track.js';

/**
 * "UK vs EU" (ADR-026): the checked item on eBay.co.uk and on the five EU eBay sites, side by side, both currencies.
 * For resellers who buy in one market and sell in the other. Costs no check.
 */

const T = tr({
  en: {
    title: 'UK vs EU',
    lead: 'Where does this sell for more? Compare eBay.co.uk with eBay in Germany, France, Italy, Spain and the Netherlands.',
    button: 'Compare UK and EU',
    loading: 'Checking both markets…',
    sells: 'Sells for',
    max: 'Pay at most',
    listings: (n: number) => `${n} listings`,
    noData: 'Not enough listings',
    unavailable: 'eBay did not answer',
    better: (where: string, pct: number, amount: string) => `Sells for about ${pct}% more ${where} (+\u2060${amount}).`,
    same: 'About the same in both markets.',
    inUk: 'in the UK',
    inEu: 'in the EU',
    note: (rate: string, date: string) => `Shipping between the UK and the EU, customs and VAT are not included. Rate ${rate} (ECB, ${date}). Costs no check.`,
  },
  de: {
    title: 'UK vs. EU',
    lead: 'Wo verkauft sich das besser? Vergleich eBay.co.uk mit eBay in Deutschland, Frankreich, Italien, Spanien und den Niederlanden.',
    button: 'UK und EU vergleichen',
    loading: 'Prüfe beide Märkte…',
    sells: 'Verkauft für',
    max: 'Höchstens zahlen',
    listings: (n: number) => `${n} Angebote`,
    noData: 'Zu wenige Angebote',
    unavailable: 'eBay hat nicht geantwortet',
    better: (where: string, pct: number, amount: string) => `Verkauft sich ${where} für etwa ${pct} % mehr (+\u2060${amount}).`,
    same: 'In beiden Märkten etwa gleich.',
    inUk: 'in Großbritannien',
    inEu: 'in der EU',
    note: (rate: string, date: string) => `Versand zwischen Großbritannien und der EU, Zoll und Mehrwertsteuer sind nicht enthalten. Kurs ${rate} (EZB, ${date}). Kostet keinen Check.`,
  },
  it: {
    title: 'UK vs UE',
    lead: "Dove si vende meglio? Confronta eBay.co.uk con eBay in Germania, Francia, Italia, Spagna e Paesi Bassi.",
    button: 'Confronta UK e UE',
    loading: 'Controllo entrambi i mercati…',
    sells: 'Si vende a',
    max: 'Paga al massimo',
    listings: (n: number) => `${n} annunci`,
    noData: 'Annunci insufficienti',
    unavailable: 'eBay non ha risposto',
    better: (where: string, pct: number, amount: string) => `Si vende a circa il ${pct} % in più ${where} (+\u2060${amount}).`,
    same: 'Più o meno uguale nei due mercati.',
    inUk: 'nel Regno Unito',
    inEu: "nell'UE",
    note: (rate: string, date: string) => `Spedizione tra Regno Unito e UE, dogana e IVA non sono incluse. Cambio ${rate} (BCE, ${date}). Non consuma controlli.`,
  },
  fr: {
    title: 'UK vs UE',
    lead: "Où ça se vend le mieux ? Compare eBay.co.uk avec eBay en Allemagne, France, Italie, Espagne et aux Pays-Bas.",
    button: "Comparer UK et UE",
    loading: 'Vérification des deux marchés…',
    sells: 'Se vend',
    max: 'Paie au maximum',
    listings: (n: number) => `${n} annonces`,
    noData: "Pas assez d'annonces",
    unavailable: "eBay n'a pas répondu",
    better: (where: string, pct: number, amount: string) => `Se vend environ ${pct} % plus cher ${where} (+\u2060${amount}).`,
    same: 'À peu près pareil sur les deux marchés.',
    inUk: 'au Royaume-Uni',
    inEu: "dans l'UE",
    note: (rate: string, date: string) => `Livraison entre le Royaume-Uni et l'UE, douane et TVA non incluses. Taux ${rate} (BCE, ${date}). Ne consomme pas de vérification.`,
  },
});

export function MarketCompare({ scanId }: { scanId: string }) {
  const [data, setData] = useState<Compare | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const s = loadSettings();
    setBusy(true);
    setError(null);
    try {
      const r = await api.compareMarkets({ scanId, shippingCost: s.shippingCost, shippingCurrency: userCurrency(), targetRoiPct: s.targetRoiPct });
      setData(r);
      track('market_compare', { better: r.better?.id ?? 'none', pct: r.better?.pct ?? 0 });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // Show the other currency next to each amount: pounds next to euros and the other way round.
  const both = (minor: number, cur: 'EUR' | 'GBP', eurMinor: number, gbpMinor: number) => (
    <>
      <strong>{money(minor, 0, cur)}</strong>
      <span className="muted small"> ≈ {cur === 'GBP' ? money(eurMinor, 0, 'EUR') : money(gbpMinor, 0, 'GBP')}</span>
    </>
  );
  const own = userCurrency();

  return (
    <section className="card mc">
      <h2>{T.title}</h2>
      {!data ? (
        <>
          <p className="muted small">{T.lead}</p>
          {error && <div className="banner bad">{error}</div>}
          <button type="button" className="ghost wide" disabled={busy} onClick={() => void run()}>{busy ? T.loading : T.button}</button>
        </>
      ) : (
        <>
          <div className="mc-grid">
            {data.markets.map((m) => (
              <div key={m.id} className={`mc-col ${data.better?.id === m.id && data.better.pct >= 5 ? 'mc-win' : ''}`}>
                <span className="mc-flag">{m.id === 'GB' ? 'UK' : 'EU'}</span>
                <span className="muted small">{m.label}</span>
                {m.status === 'ok' ? (
                  <>
                    <span className="mc-label">{T.sells}</span>
                    <span>{both(m.expectedMinor, m.currency, m.expectedEurMinor, m.expectedGbpMinor)}</span>
                    <span className="mc-label">{T.max}</span>
                    <span><strong>{money(m.maxBuyMinor, 0, m.currency)}</strong></span>
                    <span className="muted small">{T.listings(m.count)}</span>
                  </>
                ) : (
                  <span className="muted small">{m.status === 'insufficient' ? T.noData : T.unavailable}</span>
                )}
              </div>
            ))}
          </div>
          {data.better && (
            <p className="mc-verdict">
              {data.better.pct >= 5
                ? T.better(data.better.id === 'GB' ? T.inUk : T.inEu, data.better.pct, own === 'GBP' ? money(data.better.diffGbpMinor, 0, 'GBP') : money(data.better.diffEurMinor, 0, 'EUR'))
                : T.same}
            </p>
          )}
          <p className="muted small">{T.note(`1 € = ${data.fx.gbpPerEur.toLocaleString(LOCALE, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} £`, new Date(data.fx.rateDate).toLocaleDateString(LOCALE))}</p>
        </>
      )}
    </section>
  );
}
