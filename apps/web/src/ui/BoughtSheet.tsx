import { useState } from 'react';
import { api } from '../api.js';
import { errorText, tr } from '../i18n.js';
import { track } from '../track.js';

const T = tr({
  en: {
    sources: ['Flea market', 'Charity shop', 'Second-hand shop', 'Garage sale', 'Online', 'Auction'] as readonly string[],
    saveFailed: 'Could not save',
    aria: 'I bought it',
    title: 'Nice find! Add to Stock',
    pricePaid: 'Price you paid',
    where: 'Where did you buy it? (optional)',
    saving: 'Saving…',
    add: 'Add to Stock',
  },
  de: {
    sources: ['Flohmarkt', 'Sozialkaufhaus', 'Second-Hand-Laden', 'Hofflohmarkt', 'Online', 'Auktion'] as readonly string[],
    saveFailed: 'Speichern fehlgeschlagen',
    aria: 'Gekauft',
    title: 'Guter Fund! Ins Lager legen',
    pricePaid: 'Bezahlter Preis',
    where: 'Wo hast du es gekauft? (optional)',
    saving: 'Speichern…',
    add: 'Ins Lager legen',
  },
});
const SOURCES = T.sources;

/** "I bought it": moves the checked item into Stock with the price actually paid. */
export function BoughtSheet({
  scanId,
  name,
  defaultPriceMinor,
  onClose,
  onAdded,
}: {
  scanId: string;
  name: string;
  defaultPriceMinor: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [price, setPrice] = useState(String(defaultPriceMinor / 100));
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(price.replace(',', '.'));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.addInventory({ scanId, purchasePrice: value, ...(source && { source }) });
      track('item_marked_bought', { source });
      track('inventory_added', { from: 'result' });
      onAdded();
    } catch (e) {
      setError(errorText(e, T.saveFailed));
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={T.aria} onClick={(e) => e.stopPropagation()}>
        <h2>{T.title}</h2>
        <p className="muted small">{name}</p>
        <label className="field">
          <span>{T.pricePaid}</span>
          <div className="input-affix"><span>€</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </label>
        <div className="field">
          <span>{T.where}</span>
          <div className="chips-row">
            {SOURCES.map((s) => (
              <button key={s} type="button" className={`chip-btn ${source === s ? 'on' : ''}`} onClick={() => setSource(source === s ? null : s)}>{s}</button>
            ))}
          </div>
        </div>
        {error && <div className="banner bad">{error}</div>}
        <button type="button" className="primary" disabled={busy || !(value >= 0) || price === ''} onClick={() => void save()}>
          {busy ? T.saving : T.add}
        </button>
      </div>
    </div>
  );
}
