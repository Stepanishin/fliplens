import { useEffect, useRef, type FormEvent } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import { parsePrice, presetsFor, type Draft } from '../flow.js';
import { conditionLabelFor } from '../format.js';
import { tr, presetText, currencySymbol, money } from '../i18n.js';
import type { Settings } from '../storage.js';

const T = tr({
  en: {
    recognised: (pct: number) => ` · recognised ${pct}%`,
    notRight: 'Not right? Edit',
    howMuch: 'How much can you buy it for?',
    optional: '(optional)',
    skip: 'Skip',
    aria: 'Purchase price (optional)',
    hintEmpty: 'No price yet? We show what it sells for and the most you should pay.',
    hintPrice: 'We compare this price with the market.',
    selling: 'Selling on',
    context: (ship: number, roi: number) => ` · shipping ${money(Math.round(ship * 100), ship % 1 ? 2 : 0)} · target ROI ${roi}%`,
    contextNoShip: (roi: number) => ` · buyer pays shipping · target ROI ${roi}%`,
    change: 'Change',
    checking: 'Checking the market…',
    checkMarket: 'Check the market',
    shouldBuy: 'Should I buy it?',
  },
  de: {
    recognised: (pct: number) => ` · zu ${pct} % erkannt`,
    notRight: 'Falsch? Bearbeiten',
    howMuch: 'Für wie viel kannst du es kaufen?',
    optional: '(optional)',
    skip: 'Überspringen',
    aria: 'Kaufpreis (optional)',
    hintEmpty: 'Noch kein Preis? Wir zeigen, wofür es verkauft wird und was du höchstens zahlen solltest.',
    hintPrice: 'Wir vergleichen diesen Preis mit dem Markt.',
    selling: 'Verkauf auf',
    context: (ship: number, roi: number) => ` · Versand ${money(Math.round(ship * 100), ship % 1 ? 2 : 0)} · Ziel-ROI ${roi} %`,
    contextNoShip: (roi: number) => ` · Käufer zahlt Versand · Ziel-ROI ${roi} %`,
    change: 'Ändern',
    checking: 'Markt wird geprüft…',
    checkMarket: 'Markt prüfen',
    shouldBuy: 'Soll ich es kaufen?',
  },
  it: {
    recognised: (pct: number) => ` · riconosciuto al ${pct} %`,
    notRight: 'Non è giusto? Modifica',
    howMuch: 'A quanto puoi comprarlo?',
    optional: '(facoltativo)',
    skip: 'Salta',
    aria: 'Prezzo d’acquisto (facoltativo)',
    hintEmpty: 'Ancora nessun prezzo? Ti mostriamo a quanto si vende e quanto pagare al massimo.',
    hintPrice: 'Confrontiamo questo prezzo con il mercato.',
    selling: 'Vendita su',
    context: (ship: number, roi: number) => ` · spedizione ${money(Math.round(ship * 100), ship % 1 ? 2 : 0)} · ROI obiettivo ${roi} %`,
    contextNoShip: (roi: number) => ` · spedizione a carico dell’acquirente · ROI obiettivo ${roi} %`,
    change: 'Cambia',
    checking: 'Controllo del mercato…',
    checkMarket: 'Controlla il mercato',
    shouldBuy: 'Devo comprarlo?',
  },
  fr: {
    recognised: (pct: number) => ` · reconnu à ${pct} %`,
    notRight: 'Pas ça ? Modifier',
    howMuch: 'À combien peux-tu l’acheter ?',
    optional: '(facultatif)',
    skip: 'Passer',
    aria: 'Prix d’achat (facultatif)',
    hintEmpty: 'Pas encore de prix ? On te montre à combien il se vend et le prix maximum à payer.',
    hintPrice: 'On compare ce prix avec le marché.',
    selling: 'Vente sur',
    context: (ship: number, roi: number) => ` · livraison ${money(Math.round(ship * 100), ship % 1 ? 2 : 0)} · ROI cible ${roi} %`,
    contextNoShip: (roi: number) => ` · port payé par l’acheteur · ROI cible ${roi} %`,
    change: 'Modifier',
    checking: 'Vérification du marché…',
    checkMarket: 'Vérifier le marché',
    shouldBuy: 'Est-ce que je l’achète ?',
  },
});

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
  const { preset } = presetsFor(p.category, settings);
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
          {conditionLabelFor(draft.condition, p.category)}
          {draft.chosenIndex !== null && draft.identification?.candidates[draft.chosenIndex] && !draft.edited
            ? T.recognised(Math.round(draft.identification.candidates[draft.chosenIndex]!.confidence * 100))
            : ''}
        </span>
        {onEditItem && <button type="button" className="link summary-edit" onClick={onEditItem}>{T.notRight}</button>}
      </div>

      <label className="price-field">
        <span>{T.howMuch} <span className="muted">{T.optional}</span></span>
        <div className="price-input">
          <span>{currencySymbol()}</span>
          <input ref={inputRef} inputMode="decimal" enterKeyHint="go" value={draft.price} onChange={(e) => onChangePrice(e.target.value)} placeholder={T.skip} aria-label={T.aria} />
        </div>
        <small className="muted price-hint">{empty ? T.hintEmpty : T.hintPrice}</small>
      </label>

      <button type="button" className="context-row" onClick={onEditSettings}>
        <span>
          {T.selling} <strong>{presetText(preset, FEE_PRESETS[preset]).label}</strong>
          {FEE_PRESETS[preset].resolve('good', p.category || 'other').sellerPaysShipping ? T.context(settings.shippingCost, settings.targetRoiPct) : T.contextNoShip(settings.targetRoiPct)}
        </span>
        <span className="link">{T.change}</span>
      </button>

      {error && <div className="banner bad">{error}</div>}

      <div className="sticky-cta">
        <button type="submit" className="primary" disabled={!valid || busy}>
          {busy ? <><span className="spinner light" aria-hidden="true" /> {T.checking}</> : empty ? T.checkMarket : T.shouldBuy}
        </button>
      </div>
    </form>
  );
}
