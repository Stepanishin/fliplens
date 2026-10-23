import { useEffect, useState, type ReactNode } from 'react';
import { computeProfit, decide, DEFAULT_PRICING_CONFIG, isFashion, maxBuyPrice, type Confidence, type FeeProfile } from '@fliplens/core';
import { track } from '../track.js';
import type { ValuationResponse } from '../api.js';
import { ago, FACTOR_LABEL } from '../format.js';
import { money, reason, tr, presetText } from '../i18n.js';
import { MarketLinks } from '../MarketLinks.js';
import { MarketCompare } from '../ui/MarketCompare.js';
import { PlatformCompare } from '../ui/PlatformCompare.js';
import { PriceAlert } from '../ui/PriceAlert.js';
import type { Settings } from '../storage.js';
import { ConfidencePill, DecisionHero, eur, MarketActivity, RangeBar } from '../ui/verdict.js';
import { IconBag, IconEdit, IconScan, IconSpark } from '../ui/icons.js';
import { Comparables } from './Comparables.js';
import { prefetchShareLink, shareFind, type DecisionKey } from '../ui/ShareCard.js';

const T = tr({
  en: {
    shareFind: 'Share this find',
    sharing: 'Creating image…',
    notEnough: 'Not enough market data',
    tooFew: (n: number) => `Only ${n} matching listings after filtering (5 needed). We don't guess.`,
    uncertain: 'The product identification is too uncertain to value.',
    writeTitle: 'Selling it? Write the listing from your photo',
    listVinted: 'Write the Vinted listing',
    writeSub: 'Clothes and other items without price data work too: title and description for Vinted, eBay or Kleinanzeigen.',
    whatYouCanDo: 'What you can do',
    tip1: 'Check the model name, storage and mount: a wrong detail hides the market.',
    tip2: 'Scan the barcode on the box, or add a photo of the label.',
    tip3: 'Look it up yourself with the links below.',
    payAtMost: (p: string) => `Pay at most ${p}`,
    forRoi: (n: number) => `for ${n}% ROI after fees and shipping`,
    sellsFor: 'Sells for',
    quickSale: 'Quick sale',
    youKeep: 'You keep',
    tryPrice: 'Try a price',
    whatIfPay: 'What if you pay',
    purchasePrice: 'Purchase price',
    zero: '€0',
    maxFor: (n: number, p: string) => `max for ${n}% ROI: ${p}`,
    backMax: (p: string) => `Back to max price ${p}`,
    backAsking: (p: string) => `Back to asking price ${p}`,
    bought: (p: string) => `I bought it for ${p}`,
    resaleValue: 'Resale value',
    basedOn: (n: number, sold: boolean, age: string) => `Based on ${n} ${sold ? 'sold items' : 'active eBay listings (asking prices, adjusted down)'} · data ${age}`,
    fashionNote: 'Clothes are priced by brand, type and condition. Size, colour and season move the price; on Vinted similar items often sell for less.',
    why: 'Why',
    risks: 'Risks',
    market: 'Market',
    supplyOnly: "Supply only: we can't see how fast items actually sell yet.",
    breakdown: 'Money breakdown',
    net: (p: string) => `net ${p}`,
    expectedSale: 'Expected sale',
    fee: (pct: number, fixed: string | null) => `Marketplace fee (${pct}%${fixed ? ` + ${fixed}` : ''})`,
    shipping: 'Shipping',
    netRow: 'Net',
    purchase: 'Purchase',
    profit: 'Profit',
    checked: (d: string, secondary: boolean) => `checked ${d}${secondary ? ' (secondary source)' : ''}`,
    confDetails: 'Confidence details',
    edit: 'Edit',
    newScan: 'New scan',
  },
  de: {
    shareFind: 'Fund teilen',
    sharing: 'Bild wird erstellt…',
    notEnough: 'Nicht genug Marktdaten',
    tooFew: (n: number) => `Nur ${n} passende Angebote nach dem Filtern (5 nötig). Wir raten nicht.`,
    uncertain: 'Das Produkt ist zu unsicher erkannt, um es zu bewerten.',
    writeTitle: 'Willst du es verkaufen? Schreib die Anzeige aus deinem Foto',
    listVinted: 'Vinted-Anzeige schreiben',
    writeSub: 'Klappt auch mit Kleidung und anderen Artikeln ohne Preisdaten: Titel und Beschreibung für Vinted, eBay oder Kleinanzeigen.',
    whatYouCanDo: 'Was du tun kannst',
    tip1: 'Prüf Modellname, Speicher und Anschluss: ein falsches Detail versteckt den Markt.',
    tip2: 'Scan den Barcode auf der Verpackung oder füg ein Foto vom Etikett hinzu.',
    tip3: 'Schau selbst nach über die Links unten.',
    payAtMost: (p: string) => `Zahl höchstens ${p}`,
    forRoi: (n: number) => `für ${n} % ROI nach Gebühren und Versand`,
    sellsFor: 'Verkauft für',
    quickSale: 'Schnellverkauf',
    youKeep: 'Bleibt dir',
    tryPrice: 'Probier einen Preis',
    whatIfPay: 'Was, wenn du zahlst',
    purchasePrice: 'Kaufpreis',
    zero: '0 €',
    maxFor: (n: number, p: string) => `Höchstpreis für ${n} % ROI: ${p}`,
    backMax: (p: string) => `Zurück zum Höchstpreis ${p}`,
    backAsking: (p: string) => `Zurück zum Angebotspreis ${p}`,
    bought: (p: string) => `Gekauft für ${p}`,
    resaleValue: 'Wiederverkaufswert',
    basedOn: (n: number, sold: boolean, age: string) => `Basierend auf ${n} ${sold ? 'verkauften Artikeln' : 'aktiven eBay-Angeboten (Angebotspreise, nach unten korrigiert)'} · Daten ${age}`,
    fashionNote: 'Kleidung wird nach Marke, Art und Zustand bewertet. Größe, Farbe und Saison beeinflussen den Preis; auf Vinted gehen ähnliche Teile oft günstiger weg.',
    why: 'Warum',
    risks: 'Risiken',
    market: 'Markt',
    supplyOnly: 'Nur Angebotsdaten: wie schnell Artikel wirklich verkauft werden, sehen wir noch nicht.',
    breakdown: 'Rechnung im Detail',
    net: (p: string) => `netto ${p}`,
    expectedSale: 'Erwarteter Verkauf',
    fee: (pct: number, fixed: string | null) => `Plattformgebühr (${pct} %${fixed ? ` + ${fixed}` : ''})`,
    shipping: 'Versand',
    netRow: 'Netto',
    purchase: 'Einkauf',
    profit: 'Gewinn',
    checked: (d: string, secondary: boolean) => `geprüft am ${d}${secondary ? ' (Sekundärquelle)' : ''}`,
    confDetails: 'Details zur Sicherheit',
    edit: 'Bearbeiten',
    newScan: 'Neuer Scan',
  },
  it: {
    shareFind: 'Condividi questo affare',
    sharing: 'Creo l’immagine…',
    notEnough: 'Dati di mercato insufficienti',
    tooFew: (n: number) => `Solo ${n} annunci corrispondenti dopo il filtro (ne servono 5). Non tiriamo a indovinare.`,
    uncertain: 'Il riconoscimento del prodotto è troppo incerto per una valutazione.',
    writeTitle: 'Vuoi venderlo? Scrivi l’annuncio dalla tua foto',
    listVinted: 'Scrivi l’annuncio Vinted',
    writeSub: 'Funziona anche con vestiti e altri articoli senza dati di prezzo: titolo e descrizione per Vinted, eBay o Kleinanzeigen.',
    whatYouCanDo: 'Cosa puoi fare',
    tip1: 'Controlla nome del modello, memoria e attacco: un dettaglio sbagliato nasconde il mercato.',
    tip2: 'Scansiona il codice a barre sulla scatola o aggiungi una foto dell’etichetta.',
    tip3: 'Cerca tu stesso con i link qui sotto.',
    payAtMost: (p: string) => `Paga al massimo ${p}`,
    forRoi: (n: number) => `per un ROI del ${n} % dopo commissioni e spedizione`,
    sellsFor: 'Si vende a',
    quickSale: 'Vendita rapida',
    youKeep: 'Ti resta',
    tryPrice: 'Prova un prezzo',
    whatIfPay: 'E se paghi',
    purchasePrice: 'Prezzo d’acquisto',
    zero: '0 €',
    maxFor: (n: number, p: string) => `prezzo massimo per un ROI del ${n} %: ${p}`,
    backMax: (p: string) => `Torna al prezzo massimo ${p}`,
    backAsking: (p: string) => `Torna al prezzo richiesto ${p}`,
    bought: (p: string) => `L’ho comprato a ${p}`,
    resaleValue: 'Valore di rivendita',
    basedOn: (n: number, sold: boolean, age: string) => `Basato su ${n} ${sold ? 'articoli venduti' : 'annunci eBay attivi (prezzi richiesti, corretti al ribasso)'} · dati ${age}`,
    fashionNote: 'I capi sono valutati per marca, tipo e condizione. Taglia, colore e stagione influiscono sul prezzo; su Vinted articoli simili spesso si vendono a meno.',
    why: 'Perché',
    risks: 'Rischi',
    market: 'Mercato',
    supplyOnly: 'Solo dati sull’offerta: non vediamo ancora quanto velocemente si vendono davvero gli articoli.',
    breakdown: 'Dettaglio dei conti',
    net: (p: string) => `netto ${p}`,
    expectedSale: 'Vendita prevista',
    fee: (pct: number, fixed: string | null) => `Commissione della piattaforma (${pct} %${fixed ? ` + ${fixed}` : ''})`,
    shipping: 'Spedizione',
    netRow: 'Netto',
    purchase: 'Acquisto',
    profit: 'Profitto',
    checked: (d: string, secondary: boolean) => `verificato il ${d}${secondary ? ' (fonte secondaria)' : ''}`,
    confDetails: 'Dettagli sull’affidabilità',
    edit: 'Modifica',
    newScan: 'Nuova scansione',
  },
  fr: {
    shareFind: 'Partager cette trouvaille',
    sharing: 'Création de l’image…',
    notEnough: 'Pas assez de données de marché',
    tooFew: (n: number) => `Seulement ${n} annonces correspondantes après filtrage (5 nécessaires). On ne devine pas.`,
    uncertain: 'L’identification du produit est trop incertaine pour l’évaluer.',
    writeTitle: 'Tu veux le vendre ? Rédige l’annonce à partir de ta photo',
    listVinted: 'Rédiger l’annonce Vinted',
    writeSub: 'Ça marche aussi pour les vêtements et autres articles sans données de prix : titre et description pour Vinted, eBay ou Kleinanzeigen.',
    whatYouCanDo: 'Ce que tu peux faire',
    tip1: 'Vérifie le nom du modèle, le stockage et la monture : un détail erroné cache le marché.',
    tip2: 'Scanne le code-barres sur la boîte, ou ajoute une photo de l’étiquette.',
    tip3: 'Cherche toi-même avec les liens ci-dessous.',
    payAtMost: (p: string) => `Paie au maximum ${p}`,
    forRoi: (n: number) => `pour ${n} % de ROI après frais et livraison`,
    sellsFor: 'Se vend à',
    quickSale: 'Vente rapide',
    youKeep: 'Il te reste',
    tryPrice: 'Essaie un prix',
    whatIfPay: 'Et si tu paies',
    purchasePrice: 'Prix d’achat',
    zero: '0 €',
    maxFor: (n: number, p: string) => `prix maximum pour ${n} % de ROI : ${p}`,
    backMax: (p: string) => `Revenir au prix maximum ${p}`,
    backAsking: (p: string) => `Revenir au prix demandé ${p}`,
    bought: (p: string) => `Je l’ai acheté ${p}`,
    resaleValue: 'Valeur de revente',
    basedOn: (n: number, sold: boolean, age: string) => `Basé sur ${n} ${sold ? 'articles vendus' : 'annonces eBay actives (prix demandés, corrigés à la baisse)'} · données ${age}`,
    fashionNote: 'Les vêtements sont estimés selon la marque, le type et l’état. La taille, la couleur et la saison font varier le prix ; sur Vinted, des articles similaires partent souvent moins cher.',
    why: 'Pourquoi',
    risks: 'Risques',
    market: 'Marché',
    supplyOnly: 'Offre uniquement : on ne voit pas encore à quelle vitesse les articles se vendent vraiment.',
    breakdown: 'Détail du calcul',
    net: (p: string) => `net ${p}`,
    expectedSale: 'Vente prévue',
    fee: (pct: number, fixed: string | null) => `Frais de plateforme (${pct} %${fixed ? ` + ${fixed}` : ''})`,
    shipping: 'Livraison',
    netRow: 'Net',
    purchase: 'Achat',
    profit: 'Bénéfice',
    checked: (d: string, secondary: boolean) => `vérifié le ${d}${secondary ? ' (source secondaire)' : ''}`,
    confDetails: 'Détails de la fiabilité',
    edit: 'Modifier',
    newScan: 'Nouveau scan',
  },
});

interface Props {
  resp: ValuationResponse;
  query: string;
  country: string;
  onNewScan: () => void;
  onEdit: () => void;
  targetRoiPct: number;
  /** "I bought it" with the price currently selected on the slider (cents). */
  onBought?: (priceMinor: number) => void;
  /** Open the listing writer with the same photos (the way forward when there is no price data, e.g. clothes). */
  onWriteListing?: () => void;
  /** Shown right under the verdict (guests: keep the result by signing in). */
  topSlot?: ReactNode;
  /** Signed-in users: offer a price alert for this item. */
  alertSettings?: Settings;
  children?: ReactNode;
}

export function Result({ resp, query, country, onNewScan, onEdit, targetRoiPct, onBought, onWriteListing, alertSettings, topSlot, children }: Props) {
  const r = resp.result;
  const askedMinor = r.status === 'ok' ? r.profit.expected.purchasePrice.amountMinor : 0;
  // "What if I pay X?": recomputed locally with the same core logic, no new check, no quota.
  const [buyMinor, setBuyMinor] = useState(askedMinor);
  const [tried, setTried] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  // Look up the invite code early, so sharing does not wait for it.
  useEffect(() => {
    if (r.status === 'ok') prefetchShareLink();
  }, [r.status]);
  useEffect(() => setBuyMinor(askedMinor), [askedMinor, resp.scanId]);

  if (r.status === 'insufficient_data') {
    return (
      <div className="screen">
        <div className="hero d-insufficient">
          <div className="hero-title">{T.notEnough}</div>
          <div className="hero-sub">
            {r.reason === 'too_few_comparables' ? T.tooFew(r.includedCount) : T.uncertain}
          </div>
        </div>
        {topSlot}
        {onWriteListing && (
          <button type="button" className="home-tool" onClick={onWriteListing}>
            <span className="home-tool-icon"><IconSpark size={20} /></span>
            <span style={{ flex: 1 }}>
              <strong>{T.writeTitle}</strong>
              <span className="muted">{T.writeSub}</span>
            </span>
          </button>
        )}
        <section className="card">
          <h2>{T.whatYouCanDo}</h2>
          <ul className="list">
            <li>{T.tip1}</li>
            <li>{T.tip2}</li>
            <li>{T.tip3}</li>
          </ul>
        </section>
        {resp.scanId && <MarketCompare scanId={resp.scanId} />}
        <MarketLinks query={query} country={country} />
        <Comparables items={r.comparables} />
        <Actions onNewScan={onNewScan} onEdit={onEdit} />
        {children}
      </div>
    );
  }

  const e = r.estimate;
  const d = e.distribution;
  const fee = resp.feePreset;
  const feeProfile: FeeProfile = {
    id: fee.profileId,
    marketplace: fee.id,
    sellerType: 'private',
    percentageFeeBp: fee.percentageFeeBp,
    fixedFeeMinor: fee.fixedFeeMinor,
    paymentFeeBp: 0,
    paymentFixedFeeMinor: 0,
    currency: 'EUR',
    sellerPaysShipping: fee.sellerPaysShipping,
    effectiveFrom: '',
  };
  const base = r.profit.expected;
  const p =
    buyMinor === askedMinor
      ? base
      : computeProfit({
          salePrice: e.expected,
          purchasePrice: { amountMinor: buyMinor, currency: 'EUR' },
          fees: feeProfile,
          shippingCost: base.shipping,
          packagingCost: base.packaging,
        });
  const decision =
    buyMinor === askedMinor
      ? r.decision
      : (() => {
          const fast = computeProfit({
            salePrice: e.fast,
            purchasePrice: { amountMinor: buyMinor, currency: 'EUR' },
            fees: feeProfile,
            shippingCost: base.shipping,
            packagingCost: base.packaging,
          });
          return decide(
            {
              profit: p.profit,
              roiPct: p.roiPct,
              confidence: e.confidence as unknown as Confidence,
              includedCount: d.count,
              dataKind: e.dataKind,
              salePrice: e.expected,
              fastProfit: fast.profit,
              fastRoiPct: fast.roiPct,
            },
            DEFAULT_PRICING_CONFIG,
          );
        })();
  const maxBuy = r.maxBuyPrice ?? maxBuyPrice(base.net, targetRoiPct);
  // Checked without a price: lead with "pay at most"; a verdict appears once a price is tried on the slider.
  const noPrice = resp.priceProvided === false;
  const showVerdict = !noPrice || buyMinor !== askedMinor;
  const shipping = p.shipping.amountMinor;
  // Sale price where profit hits 0: S - (S * fee% + fixed) - shipping = purchase.
  const breakEven = Math.round((p.purchasePrice.amountMinor + fee.fixedFeeMinor + shipping + p.packaging.amountMinor) / (1 - fee.percentageFeeBp / 10_000));
  const sliderMax = Math.max(Math.round(e.high.amountMinor / 100) * 100, askedMinor + 1000);

  return (
    <div className="screen">
      {resp.sourceWarnings.map((w, i) => (
        <div key={i} className="banner warn small">{w.site ? `${w.site}: ` : ''}{w.message}</div>
      ))}

      {showVerdict ? (
        <DecisionHero decision={decision.decision} profitMinor={p.profit.amountMinor} roiPct={p.roiPct} expectedMinor={e.expected.amountMinor} maxBuyMinor={maxBuy.amountMinor} />
      ) : (
        <div className="hero d-value">
          <div className="hero-top">
            <div>
              <div className="hero-title">{T.payAtMost(eur(maxBuy.amountMinor))}</div>
              <div className="hero-sub">{T.forRoi(targetRoiPct)}</div>
            </div>
          </div>
          <div className="hero-numbers">
            <div><span>{T.sellsFor}</span><strong>{eur(e.expected.amountMinor)}</strong></div>
            <div><span>{T.quickSale}</span><strong>{eur(e.fast.amountMinor)}</strong></div>
            <div><span>{T.youKeep}</span><strong>{eur(base.net.amountMinor)}</strong></div>
          </div>
        </div>
      )}

      {topSlot}
      {isFashion(resp.category) && onWriteListing && (
        <button type="button" className="primary wide pc-list" onClick={onWriteListing}>
          <IconSpark size={18} /> {T.listVinted}
        </button>
      )}
      {resp.alt && <PlatformCompare alt={resp.alt} />}

      <section className="card whatif">
        <div className="card-head">
          <h2>{noPrice && !showVerdict ? T.tryPrice : T.whatIfPay}</h2>
          <strong className="whatif-price">{eur(buyMinor)}</strong>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={100}
          value={buyMinor}
          aria-label={T.purchasePrice}
          onChange={(ev) => {
            setBuyMinor(Number(ev.target.value));
            if (!tried) {
              setTried(true);
              track('whatif_used', {});
            }
          }}
          style={{ ['--pos' as string]: `${(buyMinor / sliderMax) * 100}%` }}
        />
        <div className="whatif-scale muted small">
          <span>{money(0)}</span>
          <span>{T.maxFor(targetRoiPct, eur(maxBuy.amountMinor))}</span>
          <span>{eur(sliderMax)}</span>
        </div>
        {buyMinor !== askedMinor && (
          <button type="button" className="link" onClick={() => setBuyMinor(askedMinor)}>
            {noPrice ? T.backMax(eur(askedMinor)) : T.backAsking(eur(askedMinor))}
          </button>
        )}
        {onBought && showVerdict && (
          <button type="button" className="bought-btn" onClick={() => onBought(buyMinor)}>
            <IconBag size={20} /> {T.bought(eur(buyMinor))}
          </button>
        )}
        {showVerdict && (
          <button
            type="button"
            className="ghost wide share-find-btn"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              setShareNote(null);
              try {
                const note = await shareFind({
                  product: query,
                  boughtMinor: buyMinor,
                  worthMinor: e.expected.amountMinor,
                  profitMinor: p.profit.amountMinor,
                  roiPct: p.roiPct,
                  decision: decision.decision as DecisionKey,
                });
                setShareNote(note);
              } catch {
                setShareNote(null);
              } finally {
                setSharing(false);
              }
            }}
          >
            {sharing ? T.sharing : T.shareFind}
          </button>
        )}
        {shareNote && <p className="muted small share-note">{shareNote}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{T.resaleValue}</h2>
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
        <p className="muted small">
          {T.basedOn(d.count, e.dataKind === 'sold', ago(resp.dataFetchedAt))}
        </p>
        {isFashion(resp.category) && <p className="muted small">{T.fashionNote}</p>}
      </section>

      <Comparables items={e.comparables} defaultOpen />

      {showVerdict && (
        <section className="card">
          <h2>{T.why}</h2>
          <ul className="list">{decision.factors.map((f) => <li key={f}>{reason(f)}</li>)}</ul>
          {decision.risks.length > 0 && (
            <>
              <h3>{T.risks}</h3>
              <ul className="list risks">{decision.risks.map((f) => <li key={f}>{reason(f)}</li>)}</ul>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h2>{T.market}</h2>
        <MarketActivity m={e.market} />
        <p className="muted small">{T.supplyOnly}</p>
      </section>

      <section className="card">
        <details className="adv flat">
          <summary>
            <span>{T.breakdown}</span>
            <span className="muted">{T.net(eur(p.net.amountMinor, 2))}</span>
          </summary>
          <table className="breakdown">
            <tbody>
              <tr><td>{T.expectedSale}</td><td>{eur(p.salePrice.amountMinor, 2)}</td></tr>
              <tr><td>{T.fee(fee.percentageFeeBp / 100, fee.fixedFeeMinor ? eur(fee.fixedFeeMinor, 2) : null)}</td><td>−{eur(p.marketplaceFee.amountMinor + p.paymentFee.amountMinor, 2)}</td></tr>
              <tr><td>{T.shipping}</td><td>−{eur(shipping, 2)}</td></tr>
              <tr className="sum"><td>{T.netRow}</td><td>{eur(p.net.amountMinor, 2)}</td></tr>
              <tr><td>{T.purchase}</td><td>−{eur(p.purchasePrice.amountMinor, 2)}</td></tr>
              <tr className="sum"><td>{T.profit}</td><td>{eur(p.profit.amountMinor, 2)}</td></tr>
            </tbody>
          </table>
          <p className="muted small">
            {presetText(fee.id, { label: fee.label }).label}: {fee.profileId}, {T.checked(fee.lastVerifiedAt, fee.sourceQuality === 'secondary')}.
          </p>
        </details>
        <details className="adv flat">
          <summary>
            <span>{T.confDetails}</span>
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

      {resp.scanId && <MarketCompare scanId={resp.scanId} />}
      {resp.scanId && alertSettings && <PriceAlert scanId={resp.scanId} suggestedMinor={maxBuy.amountMinor} currency={e.expected.currency as 'EUR' | 'GBP'} settings={alertSettings} />}
        <MarketLinks query={query} country={country} />
      <Actions onNewScan={onNewScan} onEdit={onEdit} />
      {children}
    </div>
  );
}

function Actions({ onNewScan, onEdit }: { onNewScan: () => void; onEdit: () => void }) {
  return (
    <div className="actions">
      <button type="button" className="ghost" onClick={onEdit}><IconEdit size={18} /> {T.edit}</button>
      <button type="button" className="primary" onClick={onNewScan}><IconScan size={20} /> {T.newScan}</button>
    </div>
  );
}
