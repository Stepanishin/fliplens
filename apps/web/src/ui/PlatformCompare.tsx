import { useState } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import type { ValuationResponse } from '../api.js';
import { money, presetText, tr } from '../i18n.js';
import { saveClothesOnVinted } from '../storage.js';
import { track } from '../track.js';
import { DECISION_TEXT } from './verdict.js';

type Cur = 'EUR' | 'GBP';

/**
 * Clothes (ADR-028): the same item valued for the other platform, Vinted next to eBay, from the same listings.
 * On Vinted the buyer pays shipping and there are no seller fees; on eBay the seller ships. Costs no extra check.
 */

const T = tr({
  en: {
    title: (p: string) => `On ${p} instead`,
    sells: 'Sells for',
    max: 'Pay at most',
    profit: 'Profit',
    vintedNote: 'Buyer pays shipping, no seller fees.',
    sellerShips: 'You pay shipping.',
    use: (p: string) => `Value clothes for ${p} from now on`,
    saved: (p: string) => `Saved. Your next clothes check uses ${p}.`,
    noData: 'Not enough listings for this comparison.',
  },
  de: {
    title: (p: string) => `Stattdessen auf ${p}`,
    sells: 'Verkauft für',
    max: 'Höchstens zahlen',
    profit: 'Gewinn',
    vintedNote: 'Käufer zahlt Versand, keine Verkaufsgebühren.',
    sellerShips: 'Du zahlst den Versand.',
    use: (p: string) => `Kleidung ab jetzt für ${p} bewerten`,
    saved: (p: string) => `Gespeichert. Dein nächster Kleidungs-Check nutzt ${p}.`,
    noData: 'Zu wenige Angebote für diesen Vergleich.',
  },
  it: {
    title: (p: string) => `Su ${p} invece`,
    sells: 'Si vende a',
    max: 'Paga al massimo',
    profit: 'Profitto',
    vintedNote: 'La spedizione la paga l’acquirente, nessuna commissione per chi vende.',
    sellerShips: 'La spedizione la paghi tu.',
    use: (p: string) => `Da ora valuta i capi per ${p}`,
    saved: (p: string) => `Salvato. Il prossimo controllo di abbigliamento usa ${p}.`,
    noData: 'Annunci insufficienti per questo confronto.',
  },
  fr: {
    title: (p: string) => `Sur ${p} à la place`,
    sells: 'Se vend',
    max: 'Paie au maximum',
    profit: 'Bénéfice',
    vintedNote: 'L’acheteur paie le port, pas de frais vendeur.',
    sellerShips: 'Tu paies le port.',
    use: (p: string) => `Estimer les vêtements pour ${p} désormais`,
    saved: (p: string) => `Enregistré. Ta prochaine vérification de vêtement utilise ${p}.`,
    noData: 'Pas assez d’annonces pour cette comparaison.',
  },
});

export function PlatformCompare({ alt }: { alt: NonNullable<ValuationResponse['alt']> }) {
  const [saved, setSaved] = useState(false);
  const label = presetText(alt.preset, FEE_PRESETS[alt.preset]).label;
  const r = alt.result;

  function use() {
    saveClothesOnVinted(alt.preset === 'vinted');
    setSaved(true);
    track('clothes_platform_set', { preset: alt.preset });
  }

  return (
    <section className="card pc">
      <h2>{T.title(label)}</h2>
      {r.status === 'ok' ? (
        <>
          <div className="pc-row">
            <div><span>{T.sells}</span><strong>{money(r.estimate.expected.amountMinor, 0, r.estimate.currency as Cur)}</strong></div>
            {r.maxBuyPrice && <div><span>{T.max}</span><strong>{money(r.maxBuyPrice.amountMinor, 0, r.maxBuyPrice.currency as Cur)}</strong></div>}
            <div><span>{T.profit}</span><strong>{money(r.profit.expected.profit.amountMinor, 0, r.profit.expected.profit.currency as Cur)}</strong></div>
          </div>
          <p className="muted small">
            {DECISION_TEXT[r.decision.decision].title} · {alt.sellerPaysShipping ? T.sellerShips : T.vintedNote}
          </p>
        </>
      ) : (
        <p className="muted small">{T.noData}</p>
      )}
      {saved ? <p className="hint">{T.saved(label)}</p> : <button type="button" className="ghost wide" onClick={use}>{T.use(label)}</button>}
    </section>
  );
}
