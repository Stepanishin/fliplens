import { useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError, type PhotoListing } from '../api.js';
import { errorText, LANG, tr } from '../i18n.js';
import { resizeToJpegDataUrl } from '../image.js';
import { marketLinks } from '../marketSearch.js';
import { track } from '../track.js';
import { IconCamera, IconImage } from '../ui/icons.js';
import { ListingResult } from '../ui/ListingResult.js';
import { EbayPublishButton } from '../ui/EbayPublish.js';
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
  it: {
    /** Vinted IT wording; passed to the writer as given. */
    conditions: ['Nuovo con cartellino', 'Nuovo senza cartellino', 'Ottime condizioni', 'Buone condizioni', 'Discrete condizioni'] as readonly string[],
    readFailed: 'Impossibile leggere la foto',
    writeFailed: 'Impossibile scrivere l’annuncio',
    title: 'Annuncio da una foto',
    intro: 'Vestiti, scarpe, casa, giocattoli o tecnologia: scatta una foto e ottieni titolo e descrizione pronti da incollare su Vinted, eBay o Kleinanzeigen.',
    photos: 'Foto',
    photoAlt: (n: number) => `Foto ${n}`,
    removePhoto: 'Rimuovi foto',
    camera: 'Fotocamera',
    gallery: 'Galleria',
    photoTip: 'Fronte, retro e l’etichetta del marchio funzionano meglio. Le foto non vengono mai salvate.',
    marketplace: 'Marketplace',
    condition: 'Condizione',
    details: 'Dettagli (facoltativi)',
    detailsPh: 'Taglia, marca, materiale, difetti, cosa è incluso',
    language: 'Lingua',
    plans: 'Vedi i piani',
    writing: 'Scrivo…',
    addPhoto: 'Aggiungi una foto per iniziare',
    write: 'Scrivi il mio annuncio',
    yours: 'Il tuo annuncio',
    missing: (list: string) => `Gli acquirenti chiederanno: ${list}. Aggiungilo nei dettagli e riscrivi.`,
    priceQ: 'Non sei sicuro del prezzo?',
    similar: 'Vedi articoli simili su Vinted',
    left: (n: number) => `Ancora ${n} ${n === 1 ? 'annuncio' : 'annunci'} IA questo mese.`,
  },
  fr: {
    /** Vinted FR wording; passed to the writer as given. */
    conditions: ['Neuf avec étiquette', 'Neuf sans étiquette', 'Très bon état', 'Bon état', 'Satisfaisant'] as readonly string[],
    readFailed: 'Impossible de lire la photo',
    writeFailed: 'Impossible de rédiger l’annonce',
    title: 'Annonce à partir d’une photo',
    intro: 'Vêtements, chaussures, maison, jouets ou high-tech : prends une photo et obtiens un titre et une description prêts à coller sur Vinted, eBay ou Kleinanzeigen.',
    photos: 'Photos',
    photoAlt: (n: number) => `Photo ${n}`,
    removePhoto: 'Supprimer la photo',
    camera: 'Appareil photo',
    gallery: 'Galerie',
    photoTip: 'L’avant, l’arrière et l’étiquette de la marque donnent les meilleurs résultats. Les photos ne sont jamais conservées.',
    marketplace: 'Plateforme',
    condition: 'État',
    details: 'Détails (facultatif)',
    detailsPh: 'Taille, marque, matière, défauts, ce qui est inclus',
    language: 'Langue',
    plans: 'Voir les offres',
    writing: 'Rédaction…',
    addPhoto: 'Ajoute une photo pour commencer',
    write: 'Rédiger mon annonce',
    yours: 'Ton annonce',
    missing: (list: string) => `Les acheteurs vont demander : ${list}. Ajoute-le dans les détails et relance la rédaction.`,
    priceQ: 'Pas sûr du prix ?',
    similar: 'Voir des articles similaires sur Vinted',
    left: (n: number) => `Encore ${n} ${n === 1 ? 'annonce' : 'annonces'} IA ce mois-ci.`,
  },
});
const CONDITIONS = T.conditions;

/** The writer reports missing facts as short English phrases; the common ones are shown in the UI language. */
const MISSING: Record<string, string> = tr<Record<string, string>>({
  en: {},
  de: {
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
  },
  it: {
    size: 'taglia',
    measurements: 'misure',
    material: 'materiale',
    flaws: 'difetti',
    defects: 'difetti',
    brand: 'marca',
    colour: 'colore',
    color: 'colore',
    condition: 'condizione',
    model: 'modello',
    "what's included": 'contenuto della confezione',
    'what is included': 'contenuto della confezione',
    age: 'età',
    fit: 'vestibilità',
  },
  fr: {
    size: 'taille',
    measurements: 'dimensions',
    material: 'matière',
    flaws: 'défauts',
    defects: 'défauts',
    brand: 'marque',
    colour: 'couleur',
    color: 'couleur',
    condition: 'état',
    model: 'modèle',
    "what's included": 'contenu',
    'what is included': 'contenu',
    age: 'âge',
    fit: 'coupe',
  },
});
const missingLabel = (m: string): string => MISSING[m.toLowerCase()] ?? m;

/** Photo in, ready-to-paste listing out. Any item, including clothes: no price check needed. */
export function QuickListing({
  country,
  initialPhotos = [],
  initialNotes = '',
  initialConditionIndex,
  onUpgrade,
}: {
  country: string;
  initialPhotos?: string[];
  /** From a check: brand, size and the suggested price, so the listing matches the valuation. */
  initialNotes?: string;
  /** Index into the Vinted condition chips. */
  initialConditionIndex?: number;
  onUpgrade: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos.slice(0, 3));
  const [market, setMarket] = useState<Market>('vinted');
  const [language, setLanguage] = useState(defaultListingLanguage(country));
  const [condition, setCondition] = useState<string | null>(initialConditionIndex !== undefined ? CONDITIONS[initialConditionIndex] ?? null : null);
  const [notes, setNotes] = useState(initialNotes);
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
          {market === 'ebay' && (
            <EbayPublishButton draft={{ title: listing.title, description: listing.description, priceMinor: null, photos, brand: listing.item.brand, conditionNote: listing.conditionText }} />
          )}
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
