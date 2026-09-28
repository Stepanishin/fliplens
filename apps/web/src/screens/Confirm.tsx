import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CATEGORIES, CONDITIONS, type CategorySlug } from '@fliplens/core';
import { Candidates } from '../Candidates.js';
import { api } from '../api.js';
import { CAPACITY_OPTIONS, hasIdentity, MOUNT_CATEGORIES, showsCapacity, type Draft, type ProductDraft } from '../flow.js';
import { CATEGORY_NAME, CONDITION_HINT, CONDITION_LABEL } from '../format.js';
import { resizeToJpegDataUrl } from '../image.js';
import { IconCamera } from '../ui/icons.js';

interface Props {
  draft: Draft;
  identifying: boolean;
  error: string | null;
  onChangeProduct: (p: Partial<ProductDraft>) => void;
  onDetectedCategory: (c: CategorySlug) => void;
  onChangeCondition: (c: Draft['condition']) => void;
  onPickCandidate: (index: number) => void;
  onAddPhotos: (photos: string[]) => void;
  onRemovePhoto: (index: number) => void;
  onContinue: () => void;
}

const CATEGORY_LABEL = (c: CategorySlug): string => CATEGORY_NAME[c] ?? c;

export function Confirm({ draft, identifying, error, onChangeProduct, onDetectedCategory, onChangeCondition, onPickCandidate, onAddPhotos, onRemovePhoto, onContinue }: Props) {
  const addRef = useRef<HTMLInputElement>(null);
  const p = draft.product;
  const r = draft.identification;
  const [detecting, setDetecting] = useState(false);
  const [otherCapacity, setOtherCapacity] = useState(false);

  // Detect the category as soon as brand + model are typed (debounced), so storage/mount fields fit the item.
  useEffect(() => {
    if (p.category !== '' || !hasIdentity(p)) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      setDetecting(true);
      api.detectCategory(p.brand.trim(), p.model.trim()).then(
        (res) => {
          if (!cancelled && res.category) onDetectedCategory(res.category);
        },
        () => undefined,
      ).finally(() => {
        if (!cancelled) setDetecting(false);
      });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [p.brand, p.model, p.category, onDetectedCategory]);

  const capacityOptions = p.category ? CAPACITY_OPTIONS[p.category] ?? [] : [];
  const capacityIsOther = p.capacity !== '' && !capacityOptions.includes(p.capacity.toUpperCase().replace(/\s/g, ''));

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3 - draft.photos.length);
    e.target.value = '';
    if (files.length > 0) onAddPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{draft.method === 'manual' ? 'What is it?' : 'Is this right?'}</h1>

      {draft.method === 'photo' && (
        <div className="thumbs">
          {draft.photos.map((src, i) => (
            <div key={i} className="thumb">
              <img src={src} alt={`Photo ${i + 1}`} />
              <button type="button" aria-label="Remove photo" onClick={() => onRemovePhoto(i)}>×</button>
            </div>
          ))}
          {draft.photos.length < 3 && (
            <button type="button" className="thumb add" onClick={() => addRef.current?.click()} aria-label="Add a photo of the label">
              <IconCamera size={20} />
              <span>Label</span>
            </button>
          )}
          <input ref={addRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
        </div>
      )}

      {identifying && (
        <div className="identifying" role="status">
          <span className="spinner" aria-hidden="true" />
          {draft.method === 'barcode' ? 'Looking up the barcode…' : 'Identifying the model…'}
        </div>
      )}
      {error && <div className="banner bad">{error}</div>}

      {r && !identifying && (
        <Candidates
          result={r}
          picked={draft.chosenIndex}
          onChoose={onPickCandidate}
          evidenceLabel={r.gtin ? 'Matching listings' : 'Read on item'}
          emptyText={
            r.gtin
              ? 'Barcode found, but the product is unclear. Type the model below.'
              : 'No product recognised. Add a photo of the label or type the model below.'
          }
          {...(r.gtin && { extra: `EAN ${r.gtin} · ${r.listingCount} eBay listings` })}
        />
      )}

      <section className="card form-card">
        {draft.edited && <p className="muted small">Corrected by you. Corrections help recognition get better.</p>}
        <div className="row2">
          <label className="field">
            <span>Brand</span>
            <input value={p.brand} onChange={(e) => onChangeProduct({ brand: e.target.value })} placeholder="Sony" autoCapitalize="words" />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={p.category} onChange={(e) => onChangeProduct({ category: e.target.value as CategorySlug | '', categoryAuto: false })}>
              <option value="">Auto-detect</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL(c)}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Model</span>
          <input value={p.model} onChange={(e) => onChangeProduct({ model: e.target.value })} placeholder="WH-1000XM4" />
        </label>
        {detecting && <p className="hint">Detecting category…</p>}
        {!detecting && p.categoryAuto && <p className="hint">Category detected automatically. Change it if it's wrong.</p>}
        {showsCapacity(p.category) && (
          <div className="field">
            <span id="cap-label">Storage</span>
            <div className="chips-row" role="radiogroup" aria-labelledby="cap-label">
              <button type="button" role="radio" aria-checked={p.capacity === '' && !otherCapacity} className={`chip-btn ${p.capacity === '' && !otherCapacity ? 'on' : ''}`} onClick={() => { setOtherCapacity(false); onChangeProduct({ capacity: '' }); }}>
                Not sure
              </button>
              {capacityOptions.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={p.capacity === c} className={`chip-btn ${p.capacity === c ? 'on' : ''}`} onClick={() => { setOtherCapacity(false); onChangeProduct({ capacity: c }); }}>
                  {c.replace(/(\d)(GB|TB)/, '$1 $2')}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={otherCapacity || capacityIsOther} className={`chip-btn ${otherCapacity || capacityIsOther ? 'on' : ''}`} onClick={() => setOtherCapacity(true)}>
                Other
              </button>
            </div>
            {(otherCapacity || capacityIsOther) && (
              <input value={p.capacity} onChange={(e) => onChangeProduct({ capacity: e.target.value })} placeholder="e.g. 32GB" aria-label="Other storage size" />
            )}
            <span className="hint">{p.capacity ? 'Only listings with this storage are compared.' : 'All storage versions are compared. Pick one if you know it for a more precise price.'}</span>
          </div>
        )}
        {p.category !== '' && MOUNT_CATEGORIES.includes(p.category) && (
          <label className="field">
            <span>Mount</span>
            <input value={p.mount} onChange={(e) => onChangeProduct({ mount: e.target.value })} placeholder="RF, EF, EF-S, FE" />
          </label>
        )}
        <details className="adv">
          <summary>Similar models to exclude{p.excludeModels ? `: ${p.excludeModels}` : ''}</summary>
          <label className="field">
            <span>Comma separated</span>
            <input value={p.excludeModels} onChange={(e) => onChangeProduct({ excludeModels: e.target.value })} placeholder="WH-1000XM5, WH-1000XM3" />
          </label>
        </details>

        <div className="field">
          <span id="cond-label">Condition{r?.conditionGuess ? ` (suggested: ${CONDITION_LABEL[r.conditionGuess]})` : ''}</span>
          <div className="condition-scale" role="radiogroup" aria-labelledby="cond-label">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={draft.condition === c}
                className={`cond-opt ${draft.condition === c ? 'on' : ''}`}
                onClick={() => onChangeCondition(c)}
              >
                <span className="cond-dot" aria-hidden="true" />
                {CONDITION_LABEL[c]}
              </button>
            ))}
          </div>
          <span className="hint">{CONDITION_LABEL[draft.condition]}: {CONDITION_HINT[draft.condition]}</span>
        </div>
      </section>

      <div className="sticky-cta">
        <button type="button" className="primary" disabled={!hasIdentity(p) || identifying} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
