import { useRef, type ChangeEvent } from 'react';
import { CATEGORIES, CONDITIONS, type CategorySlug } from '@fliplens/core';
import { Candidates } from '../Candidates.js';
import { CAPACITY_CATEGORIES, hasIdentity, MOUNT_CATEGORIES, type Draft, type ProductDraft } from '../flow.js';
import { CONDITION_LABEL } from '../format.js';
import { resizeToJpegDataUrl } from '../image.js';
import { IconCamera } from '../ui/icons.js';

interface Props {
  draft: Draft;
  identifying: boolean;
  error: string | null;
  onChangeProduct: (p: Partial<ProductDraft>) => void;
  onChangeCondition: (c: Draft['condition']) => void;
  onPickCandidate: (index: number) => void;
  onAddPhotos: (photos: string[]) => void;
  onRemovePhoto: (index: number) => void;
  onContinue: () => void;
}

const CATEGORY_LABEL = (c: CategorySlug): string => c.replace(/_/g, ' ');

export function Confirm({ draft, identifying, error, onChangeProduct, onChangeCondition, onPickCandidate, onAddPhotos, onRemovePhoto, onContinue }: Props) {
  const addRef = useRef<HTMLInputElement>(null);
  const p = draft.product;
  const r = draft.identification;

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
            <select value={p.category} onChange={(e) => onChangeProduct({ category: e.target.value as CategorySlug })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL(c)}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Model</span>
          <input value={p.model} onChange={(e) => onChangeProduct({ model: e.target.value })} placeholder="WH-1000XM4" />
        </label>
        {CAPACITY_CATEGORIES.includes(p.category) && (
          <label className="field">
            <span>Storage</span>
            <input value={p.capacity} onChange={(e) => onChangeProduct({ capacity: e.target.value })} placeholder="e.g. 128GB, empty if unsure" />
            <span className="hint">A wrong value hides most of the market.</span>
          </label>
        )}
        {MOUNT_CATEGORIES.includes(p.category) && (
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
          <span>Condition{r?.conditionGuess ? ` (suggested: ${CONDITION_LABEL[r.conditionGuess]})` : ''}</span>
          <div className="chips-row">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className={`chip-btn ${draft.condition === c ? 'on' : ''}`} onClick={() => onChangeCondition(c)}>
                {CONDITION_LABEL[c]}
              </button>
            ))}
          </div>
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
