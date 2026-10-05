import { useEffect, useRef, type FormEvent } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import { parsePrice, type Draft } from '../flow.js';
import { CONDITION_LABEL } from '../format.js';
import type { Settings } from '../storage.js';

interface Props {
  draft: Draft;
  settings: Settings;
  busy: boolean;
  error: string | null;
  onChangePrice: (price: string) => void;
  onSubmit: () => void;
  onEditSettings: () => void;
  /** Back to the identify step (shown when that step was skipped automatically). */
  onEditItem?: () => void;
}

export function Price({ draft, settings, busy, error, onChangePrice, onSubmit, onEditSettings, onEditItem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const p = draft.product;
  const empty = draft.price.trim() === '';
  const valid = empty || parsePrice(draft.price) >= 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid && !busy) onSubmit();
  }

  return (
    <form className="screen" onSubmit={submit}>
      <div className="summary-chip">
        <strong>{p.brand} {p.model}{p.capacity ? ` ${p.capacity}` : ''}</strong>
        <span className="muted small">
          {CONDITION_LABEL[draft.condition]}
          {draft.chosenIndex !== null && draft.identification?.candidates[draft.chosenIndex] && !draft.edited
            ? ` · recognised ${Math.round(draft.identification.candidates[draft.chosenIndex]!.confidence * 100)}%`
            : ''}
        </span>
        {onEditItem && <button type="button" className="link summary-edit" onClick={onEditItem}>Not right? Edit</button>}
      </div>

      <label className="price-field">
        <span>How much can you buy it for? <span className="muted">(optional)</span></span>
        <div className="price-input">
          <span>€</span>
          <input ref={inputRef} inputMode="decimal" enterKeyHint="go" value={draft.price} onChange={(e) => onChangePrice(e.target.value)} placeholder="Skip" aria-label="Purchase price in euro (optional)" />
        </div>
        <small className="muted price-hint">{empty ? 'No price yet? We show what it sells for and the most you should pay.' : 'We compare this price with the market.'}</small>
      </label>

      <button type="button" className="context-row" onClick={onEditSettings}>
        <span>
          Selling on <strong>{FEE_PRESETS[settings.preset].label}</strong> · shipping €{settings.shippingCost} · target ROI {settings.targetRoiPct}%
        </span>
        <span className="link">Change</span>
      </button>

      {error && <div className="banner bad">{error}</div>}

      <div className="sticky-cta">
        <button type="submit" className="primary" disabled={!valid || busy}>
          {busy ? <><span className="spinner light" aria-hidden="true" /> Checking the market…</> : empty ? 'Check the market' : 'Should I buy it?'}
        </button>
      </div>
    </form>
  );
}
