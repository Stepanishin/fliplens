import { useState } from 'react';
import { api, ApiError, type InventoryItem } from '../api.js';
import { errorText, LANG, tr } from '../i18n.js';
import { track } from '../track.js';
import { ListingResult } from './ListingResult.js';

export type Market = 'ebay' | 'vinted' | 'kleinanzeigen';
export const MARKETS: readonly [Market, string][] = [['ebay', 'eBay'], ['vinted', 'Vinted'], ['kleinanzeigen', 'Kleinanzeigen']];
export const LANGUAGES: readonly [string, string][] = [
  ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['it', 'Italiano'], ['es', 'Español'], ['nl', 'Nederlands'],
  ['pl', 'Polski'], ['sl', 'Slovenščina'], ['hr', 'Hrvatski'], ['cs', 'Čeština'], ['pt', 'Português'], ['sv', 'Svenska'],
];
export const LANG_BY_COUNTRY: Record<string, string> = {
  DE: 'de', AT: 'de', CH: 'de', FR: 'fr', BE: 'fr', LU: 'fr', IT: 'it', ES: 'es', NL: 'nl', PL: 'pl', SI: 'sl', HR: 'hr', CZ: 'cs', PT: 'pt', SE: 'sv',
};

const T = tr({
  en: {
    failed: 'Could not write the listing',
    title: 'Write listing',
    marketplace: 'Marketplace',
    language: 'Language',
    notes: 'Notes (optional)',
    notesPh: 'box, charger, small scratch',
    writing: 'Writing…',
    write: 'Write listing',
    plans: 'See plans',
  },
  de: {
    failed: 'Die Anzeige konnte nicht geschrieben werden',
    title: 'Anzeige schreiben',
    marketplace: 'Marktplatz',
    language: 'Sprache',
    notes: 'Notizen (optional)',
    notesPh: 'OVP, Ladekabel, kleiner Kratzer',
    writing: 'Schreibe…',
    write: 'Anzeige schreiben',
    plans: 'Tarife ansehen',
  },
});

/** Default language of the listing: the country's language, else the UI language. */
export function defaultListingLanguage(country: string): string {
  return LANG_BY_COUNTRY[country] ?? (LANG === 'de' ? 'de' : 'en');
}

interface Listing {
  title: string;
  description: string;
  conditionText: string;
  keywords: string[];
  suggestedPriceMinor: number | null;
  sellUrl: string;
}

/** Listing generator: marketplace-style text to copy, plus a link to the marketplace's "sell" page. */
export function ListingSheet({ item, country, onClose, onUpgrade }: { item: InventoryItem; country: string; onClose: () => void; onUpgrade: () => void }) {
  const [market, setMarket] = useState<Market>(country === 'DE' ? 'kleinanzeigen' : 'ebay');
  const [language, setLanguage] = useState(defaultListingLanguage(country));
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.generateListing({ inventoryId: item.id, marketplace: market, language, ...(notes.trim() && { notes: notes.trim() }) });
      setListing(r);
      track('listing_generated', { marketplace: market, language });
    } catch (e) {
      setError({ text: errorText(e, T.failed), upgrade: e instanceof ApiError && e.code === 'upgrade_required' });
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={T.title} onClick={(e) => e.stopPropagation()}>
        <h2>{T.title}</h2>
        <p className="muted small">{item.brand} {item.model}{item.capacity ? ` ${item.capacity}` : ''}</p>

        <div className="seg" role="radiogroup" aria-label={T.marketplace}>
          {MARKETS.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={market === id} className={market === id ? 'on' : ''} onClick={() => { setMarket(id); setListing(null); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="row2">
          <label className="field">
            <span>{T.language}</span>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); setListing(null); }}>
              {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{T.notes}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={T.notesPh} />
          </label>
        </div>

        {!listing && (
          <button type="button" className="primary" disabled={busy} onClick={() => void generate()}>
            {busy ? <><span className="spinner light" aria-hidden="true" /> {T.writing}</> : T.write}
          </button>
        )}
        {error && (
          <div className="banner bad">
            {error.text}
            {error.upgrade && <> <button type="button" className="link" onClick={onUpgrade}>{T.plans}</button></>}
          </div>
        )}

        {listing && (
          <ListingResult listing={listing} marketName={MARKETS.find(([id]) => id === market)?.[1] ?? ''} busy={busy} onRegenerate={() => void generate()} />
        )}
      </div>
    </div>
  );
}
