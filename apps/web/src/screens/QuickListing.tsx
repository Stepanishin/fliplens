import { useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError, type PhotoListing } from '../api.js';
import { resizeToJpegDataUrl } from '../image.js';
import { marketLinks } from '../marketSearch.js';
import { track } from '../track.js';
import { IconCamera, IconImage } from '../ui/icons.js';
import { ListingResult } from '../ui/ListingResult.js';
import { LANG_BY_COUNTRY, LANGUAGES, MARKETS, type Market } from '../ui/ListingSheet.js';

/** Condition wording Vinted sellers know; passed to the writer as given. */
const CONDITIONS = ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'] as const;

/** Photo in, ready-to-paste listing out. Any item, including clothes: no price check needed. */
export function QuickListing({ country, initialPhotos = [], onUpgrade }: { country: string; initialPhotos?: string[]; onUpgrade: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos.slice(0, 3));
  const [market, setMarket] = useState<Market>('vinted');
  const [language, setLanguage] = useState(LANG_BY_COUNTRY[country] ?? 'en');
  const [condition, setCondition] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  const [listing, setListing] = useState<PhotoListing | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3 - photos.length);
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const added = await Promise.all(files.map((f) => resizeToJpegDataUrl(f)));
      setPhotos((p) => [...p, ...added].slice(0, 3));
      setListing(null);
    } catch (err) {
      setError({ text: err instanceof Error ? err.message : 'Could not read the photo', upgrade: false });
    }
  }

  async function generate() {
    if (photos.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.photoListing({
        images: photos,
        marketplace: market,
        language,
        ...(condition && { condition }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      setListing(r);
      track('listing_generated', { marketplace: market, language, from: 'photo', photos: photos.length });
    } catch (e) {
      setError({ text: e instanceof ApiError ? e.message : 'Could not write the listing', upgrade: e instanceof ApiError && e.code === 'upgrade_required' });
    } finally {
      setBusy(false);
    }
  }

  const query = listing ? [listing.item.brand, listing.item.colour, listing.item.type].filter(Boolean).join(' ') : '';
  const vinted = query ? marketLinks(query, country).local.find((l) => l.id === 'vinted') : undefined;
  const left = listing?.usage.limit != null ? Math.max(0, listing.usage.limit - listing.usage.used) : null;

  return (
    <div className="screen">
      <h1 className="screen-title">Listing from a photo</h1>
      <p className="muted">Clothes, shoes, home, toys or tech: take a photo and get a title and description ready to paste into Vinted, eBay or Kleinanzeigen.</p>

      <section className="card">
        <h2>Photos {photos.length > 0 && <span className="muted small">{photos.length}/3</span>}</h2>
        {photos.length > 0 && (
          <div className="ql-photos">
            {photos.map((p, i) => (
              <div key={i} className="ql-photo">
                <img src={p} alt={`Photo ${i + 1}`} />
                <button type="button" aria-label="Remove photo" onClick={() => { setPhotos(photos.filter((_, j) => j !== i)); setListing(null); }}>×</button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 3 && (
          <div className="ql-add">
            <button type="button" className="ghost" onClick={() => cameraRef.current?.click()}><IconCamera size={18} /> Camera</button>
            <button type="button" className="ghost" onClick={() => galleryRef.current?.click()}><IconImage size={18} /> Gallery</button>
          </div>
        )}
        <p className="muted small">Front, back and the brand label work best. Photos are never stored.</p>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e)} />
      </section>

      <section className="card">
        <div className="seg" role="radiogroup" aria-label="Marketplace">
          {MARKETS.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={market === id} className={market === id ? 'on' : ''} onClick={() => { setMarket(id); setListing(null); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="field">
          <span>Condition</span>
          <div className="chips-row">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className={`chip-btn ${condition === c ? 'on' : ''}`} onClick={() => setCondition(condition === c ? null : c)}>{c}</button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Details (optional)</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Size, brand, material, flaws, what's included" maxLength={600} />
        </label>
        <label className="field">
          <span>Language</span>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); setListing(null); }}>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </section>

      {error && (
        <div className="banner bad">
          {error.text}
          {error.upgrade && <> <button type="button" className="link" onClick={onUpgrade}>See plans</button></>}
        </div>
      )}

      {!listing && (
        <div className="sticky-cta">
          <button type="button" className="primary" disabled={busy || photos.length === 0} onClick={() => void generate()}>
            {busy ? <><span className="spinner light" aria-hidden="true" /> Writing…</> : photos.length === 0 ? 'Add a photo to start' : 'Write my listing'}
          </button>
        </div>
      )}

      {listing && (
        <section className="card">
          <h2>Your listing</h2>
          {listing.missing.length > 0 && (
            <div className="banner warn small">
              Buyers will ask about: {listing.missing.join(', ')}. Add it to the details and write again.
            </div>
          )}
          <ListingResult listing={listing} marketName={MARKETS.find(([id]) => id === market)?.[1] ?? ''} busy={busy} onRegenerate={() => void generate()} />
          {vinted && (
            <p className="muted small">
              Not sure about the price? <a href={vinted.url} target="_blank" rel="noreferrer" onClick={() => track('market_link_opened', { id: 'vinted', from: 'listing' })}>See similar items on Vinted</a>.
            </p>
          )}
          {left !== null && <p className="muted small">{left} AI listing{left === 1 ? '' : 's'} left this month.</p>}
        </section>
      )}
    </div>
  );
}
