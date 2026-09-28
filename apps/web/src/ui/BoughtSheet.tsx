import { useState } from 'react';
import { api, ApiError } from '../api.js';
import { track } from '../track.js';

const SOURCES = ['Flea market', 'Charity shop', 'Second-hand shop', 'Garage sale', 'Online', 'Auction'] as const;

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
      setError(e instanceof ApiError ? e.message : 'Could not save');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="I bought it" onClick={(e) => e.stopPropagation()}>
        <h2>Nice find! Add to Stock</h2>
        <p className="muted small">{name}</p>
        <label className="field">
          <span>Price you paid</span>
          <div className="input-affix"><span>€</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </label>
        <div className="field">
          <span>Where did you buy it? (optional)</span>
          <div className="chips-row">
            {SOURCES.map((s) => (
              <button key={s} type="button" className={`chip-btn ${source === s ? 'on' : ''}`} onClick={() => setSource(source === s ? null : s)}>{s}</button>
            ))}
          </div>
        </div>
        {error && <div className="banner bad">{error}</div>}
        <button type="button" className="primary" disabled={busy || !(value >= 0) || price === ''} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Add to Stock'}
        </button>
      </div>
    </div>
  );
}
