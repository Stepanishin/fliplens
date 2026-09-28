import { useEffect, useState } from 'react';
import { api, ApiError, type BenchmarkAddRequest, type ValuationRequest } from './api.js';

type PhotoContext = NonNullable<BenchmarkAddRequest['photoContext']>;
const CONTEXTS: readonly [PhotoContext, string][] = [
  ['in_hand_shop_light', 'In hand / shop'],
  ['on_table', 'On table'],
  ['boxed', 'Boxed'],
  ['label_visible', 'Label visible'],
  ['poor_light', 'Poor light'],
];

interface Props {
  photos: string[];
  /** The form as it would be sent for valuation: this is the ground truth, correct it before saving. */
  request: ValuationRequest | null;
}

/** Saves the current photos + corrected identity + a manually researched market range to eval/dataset. */
export function BenchmarkAdd({ photos, request }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [kind, setKind] = useState<'sold' | 'asking'>('sold');
  const [context, setContext] = useState<PhotoContext>('in_hand_shop_light');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.benchmarkCount().then((r) => setCount(r.count), () => setCount(null));
  }, []);

  const num = (s: string): number => Number(s.replace(',', '.'));
  const missing = [
    photos.length === 0 && 'a photo',
    !request?.product.brand && 'brand',
    !request?.product.model && 'model',
    !(request && request.purchasePrice >= 0) && 'purchase price',
    !(num(low) > 0 && num(high) >= num(low)) && 'market range (low ≤ high)',
  ].filter(Boolean);

  async function save() {
    if (!request || missing.length > 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = request.product;
      const r = await api.benchmarkAdd({
        images: photos,
        category: p.category ?? 'other',
        truth: { brand: p.brand, model: p.model, ...(p.capacity && { capacity: p.capacity }), ...(p.mount && { mount: p.mount }) },
        condition: request.condition,
        purchasePriceEur: request.purchasePrice,
        marketRange: { low: num(low), high: num(high), kind },
        photoContext: context,
        ...(url.trim() && { referenceUrls: [url.trim()] }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      setCount(r.count);
      setMsg({ ok: true, text: `Saved as ${r.id}. Benchmark now has ${r.count} items.` });
      setLow('');
      setHigh('');
      setUrl('');
      setNotes('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card bench">
      <summary>
        <strong>Add to benchmark</strong>
        <span className="muted small"> {count === null ? '' : `${count} items so far`}</span>
      </summary>
      <p className="muted small">
        Saves the photos above with the brand/model/condition/price from the form as the correct answer. Fix the form first if recognition was wrong.
        Market range = what this item really sells for (e.g. eBay sold, your own sales).
      </p>
      <div className="row2">
        <label className="field">
          <span>Sells for, low (€)</span>
          <input inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} placeholder="90" />
        </label>
        <label className="field">
          <span>Sells for, high (€)</span>
          <input inputMode="decimal" value={high} onChange={(e) => setHigh(e.target.value)} placeholder="120" />
        </label>
      </div>
      <div className="field">
        <span>Range is based on</span>
        <div className="seg">
          <button type="button" className={kind === 'sold' ? 'on' : ''} onClick={() => setKind('sold')}>Sold prices</button>
          <button type="button" className={kind === 'asking' ? 'on' : ''} onClick={() => setKind('asking')}>Only listings</button>
        </div>
      </div>
      <label className="field">
        <span>Photo taken</span>
        <select value={context} onChange={(e) => setContext(e.target.value as PhotoContext)}>
          {CONTEXTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Source link (optional)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.ebay.de/sch/...&LH_Sold=1" />
      </label>
      <label className="field">
        <span>Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="scratches on the case, no charger" />
      </label>
      {missing.length > 0 && <p className="muted small">Needed: {missing.join(', ')}.</p>}
      {msg && <div className={`banner ${msg.ok ? 'good' : 'bad'}`}>{msg.text}</div>}
      <button type="button" className="primary" disabled={busy || missing.length > 0} onClick={() => void save()}>
        {busy ? 'Saving…' : 'Save to benchmark'}
      </button>
    </details>
  );
}
