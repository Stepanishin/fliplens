import { useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError, type PhotoListing } from '../api.js';
import { errorText, LANG, tr } from '../i18n.js';
import { resizeToJpegDataUrl } from '../image.js';
import { marketLinks } from '../marketSearch.js';
import { track } from '../track.js';
import { IconCamera, IconImage } from '../ui/icons.js';
import { ListingResult } from '../ui/ListingResult.js';
import { defaultListingLanguage, LANGUAGES, MARKETS, type Market } from '../ui/ListingSheet.js';

const T = tr({
  en: {
    /** Condition wording Vinted sellers know; passed to the writer as given. */
    conditions: ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'] as readonly string[],
    readFailed: 'Could not read the photo',
    writeFailed: 'Could not write the listing',
    title: 'Listing from a photo',
    intro: 'Clothes, shoes, home, toys or tech: take a photo and get a title and description ready to paste into Vinted, eBay or Kleinanzeigen.',
    photos: 'Photos',
    photoAlt: (n: number) => `Photo ${n}`,
    removePhoto: 'Remove photo',
    camera: 'Camera',
    gallery: 'Gallery',
    photoTip: 'Front, back and the brand label work best. Photos are never stored.',
    marketplace: 'Marketplace',
    condition: 'Condition',
    details: 'Details (optional)',
    detailsPh: "Size, brand, material, flaws, what's included",
    language: 'Language',
    plans: 'See plans',
    writing: 'Writing…',
    addPhoto: 'Add a photo to start',
    write: 'Write my listing',
    yours: 'Your listing',
    missing: (list: string) => `Buyers will ask about: ${list}. Add it to the details and write again.`,
    priceQ: 'Not sure about the price?',
    similar: 'See similar items on Vinted',
    left: (n: number) => `${n} AI listing${n === 1 ? '' : 's'} left this month.`,
  },
  de: {
    /** Vinted DE wording; passed to the writer as given. */
    conditions: ['Neu mit Etikett', 'Neu ohne Etikett', 'Sehr gut', 'Gut', 'Zufriedenstellend'] as readonly string[],
    readFailed: 'Das Foto konnte nicht gelesen werden',
    writeFailed: 'Die Anzeige konnte nicht geschrieben werden',
    title: 'Anzeige aus einem Foto',
    intro: 'Kleidung, Schuhe, Wohnen, Spielzeug oder Technik: mach ein Foto und erhalte Titel und Beschreibung, fertig zum Einfügen bei Vinted, eBay oder Kleinanzeigen.',
    photos: 'Fotos',
    photoAlt: (n: number) => `Foto ${n}`,
    removePhoto: 'Foto entfernen',
    camera: 'Kamera',
    gallery: 'Galerie',
    photoTip: 'Vorderseite, Rückseite und das Markenetikett funktionieren am besten. Fotos werden nie gespeichert.',
    marketplace: 'Marktplatz',
    condition: 'Zustand',
    details: 'Details (optional)',
    detailsPh: 'Größe, Marke, Material, Mängel, was dabei ist',
    language: 'Sprache',
    plans: 'Tarife ansehen',
    writing: 'Schreibe…',
    addPhoto: 'Füg ein Foto hinzu, um zu starten',
    write: 'Meine Anzeige schreiben',
    yours: 'Deine Anzeige',
    missing: (list: string) => `Käufer werden fragen nach: ${list}. Ergänze es bei den Details und schreib neu.`,
    priceQ: 'Unsicher beim Preis?',
    similar: 'Ähnliche Artikel auf Vinted ansehen',
    left: (n: number) => `Noch ${n} KI-${n === 1 ? 'Anzeige' : 'Anzeigen'} diesen Monat.`,
  },
});
const CONDITIONS = T.conditions;

/** The writer reports missing facts as short English phrases; the common ones are shown in German. */
const MISSING_DE: Record<string, string> = {
  size: 'Größe',
  measurements: 'Maße',
  material: 'Material',
  flaws: 'Mängel',
  defects: 'Mängel',
  brand: 'Marke',
  colour: 'Farbe',
  color: 'Farbe',
  condition: 'Zustand',
  model: 'Modell',
  "what's included": 'Lieferumfang',
  'what is included': 'Lieferumfang',
  age: 'Alter',
  fit: 'Passform',
};
const missingLabel = (m: string): string => (LANG === 'de' ? (MISSING_DE[m.toLowerCase()] ?? m) : m);

/** Photo in, ready-to-paste listing out. Any item, including clothes: no price check needed. */
export function QuickListing({ country, initialPhotos = [], onUpgrade }: { country: string; initialPhotos?: string[]; onUpgrade: () => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos.slice(0, 3));
  const [market, setMarket] = useState<Market>('vinted');
  const [language, setLanguage] = useState(defaultListingLanguage(country));
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
      setError({ text: err instanceof Error && LANG === 'en' ? err.message : T.readFailed, upgrade: false });
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
      setError({ text: errorText(e, T.writeFailed), upgrade: e instanceof ApiError && e.code === 'upgrade_required' });
    } finally {
      setBusy(false);
    }
  }

  const query = listing ? [listing.item.brand, listing.item.colour, listing.item.type].filter(Boolean).join(' ') : '';
  const vinted = query ? marketLinks(query, country).local.find((l) => l.id === 'vinted') : undefined;
  const left = listing?.usage.limit != null ? Math.max(0, listing.usage.limit - listing.usage.used) : null;

  return (
    <div className="screen">
      <h1 className="screen-title">{T.title}</h1>
      <p className="muted">{T.intro}</p>

      <section className="card">
        <h2>{T.photos} {photos.length > 0 && <span className="muted small">{photos.length}/3</span>}</h2>
        {photos.length > 0 && (
          <div className="ql-photos">
            {photos.map((p, i) => (
              <div key={i} className="ql-photo">
                <img src={p} alt={T.photoAlt(i + 1)} />
                <button type="button" aria-label={T.removePhoto} onClick={() => { setPhotos(photos.filter((_, j) => j !== i)); setListing(null); }}>×</button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 3 && (
          <div className="ql-add">
            <button type="button" className="ghost" onClick={() => cameraRef.current?.click()}><IconCamera size={18} /> {T.camera}</button>
            <button type="button" className="ghost" onClick={() => galleryRef.current?.click()}><IconImage size={18} /> {T.gallery}</button>
          </div>
        )}
        <p className="muted small">{T.photoTip}</p>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e)} />
      </section>

      <section className="card">
        <div className="seg" role="radiogroup" aria-label={T.marketplace}>
          {MARKETS.map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={market === id} className={market === id ? 'on' : ''} onClick={() => { setMarket(id); setListing(null); }}>
              {label}
            </button>
          ))}
        </div>
        <div className="field">
          <span>{T.condition}</span>
          <div className="chips-row">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className={`chip-btn ${condition === c ? 'on' : ''}`} onClick={() => setCondition(condition === c ? null : c)}>{c}</button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>{T.details}</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={T.detailsPh} maxLength={600} />
        </label>
        <label className="field">
          <span>{T.language}</span>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); setListing(null); }}>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </section>

      {error && (
        <div className="banner bad">
          {error.text}
          {error.upgrade && <> <button type="button" className="link" onClick={onUpgrade}>{T.plans}</button></>}
        </div>
      )}

      {!listing && (
        <div className="sticky-cta">
          <button type="button" className="primary" disabled={busy || photos.length === 0} onClick={() => void generate()}>
            {busy ? <><span className="spinner light" aria-hidden="true" /> {T.writing}</> : photos.length === 0 ? T.addPhoto : T.write}
          </button>
        </div>
      )}

      {listing && (
        <section className="card">
          <h2>{T.yours}</h2>
          {listing.missing.length > 0 && (
            <div className="banner warn small">
              {T.missing(listing.missing.map(missingLabel).join(', '))}
            </div>
          )}
          <ListingResult listing={listing} marketName={MARKETS.find(([id]) => id === market)?.[1] ?? ''} busy={busy} onRegenerate={() => void generate()} />
          {vinted && (
            <p className="muted small">
              {T.priceQ} <a href={vinted.url} target="_blank" rel="noreferrer" onClick={() => track('market_link_opened', { id: 'vinted', from: 'listing' })}>{T.similar}</a>.
            </p>
          )}
          {left !== null && <p className="muted small">{T.left(left)}</p>}
        </section>
      )}
    </div>
  );
}
