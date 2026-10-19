import { useRef, useState, type ChangeEvent } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import { addPhotos, clearBatch, MAX_BATCH, removeItem, run, setBrand, useBatch, writeAllListings, writeListing, type BatchItem } from '../batch.js';
import { resizeToJpegDataUrl } from '../image.js';
import { money, presetText, tr } from '../i18n.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';
import { IconCamera, IconImage, IconSpark } from '../ui/icons.js';
import { ListingResult } from '../ui/ListingResult.js';

const T = tr({
  en: {
    title: 'Many items at once',
    lead: 'Clearing out a wardrobe or a box? Add one photo per item, with the label in view if you can. We value each one and write the listings.',
    gallery: 'Choose photos',
    camera: 'Take a photo',
    count: (n: number) => `${n} of ${MAX_BATCH} items`,
    usesChecks: (n: number, left: number | null) => `Uses ${n} ${n === 1 ? 'check' : 'checks'}${left !== null ? `, you have ${left} left` : ''}.`,
    start: (n: number) => `Check ${n} ${n === 1 ? 'item' : 'items'}`,
    total: (n: number, sum: string) => `${n} ${n === 1 ? 'item' : 'items'} · about ${sum} in total`,
    writeAll: 'Write all listings',
    writing: 'Writing…',
    identifying: 'Recognising…',
    valuing: 'Checking the market…',
    queued: 'Waiting',
    notFound: 'Not recognised. Try a clearer photo or check it on its own.',
    needsBrand: 'No brand found on the photo. Type it from the label:',
    brandPh: 'Brand',
    check: 'Check',
    notEnough: 'Not enough listings to price it',
    sellsFor: (p: string, where: string) => `about ${p} on ${where}`,
    quick: (p: string) => `quick sale ${p}`,
    details: 'Details',
    listing: 'Write listing',
    hideListing: 'Hide listing',
    showListing: 'Show listing',
    remove: 'Remove',
    clear: 'Start over',
    upgrade: 'See plans',
  },
  de: {
    title: 'Viele Artikel auf einmal',
    lead: 'Du räumst den Kleiderschrank oder eine Kiste aus? Füg ein Foto pro Artikel hinzu, wenn möglich mit Etikett. Wir bewerten jeden und schreiben die Anzeigen.',
    gallery: 'Fotos auswählen',
    camera: 'Foto aufnehmen',
    count: (n: number) => `${n} von ${MAX_BATCH} Artikeln`,
    usesChecks: (n: number, left: number | null) => `Braucht ${n} ${n === 1 ? 'Check' : 'Checks'}${left !== null ? `, du hast noch ${left}` : ''}.`,
    start: (n: number) => `${n} ${n === 1 ? 'Artikel' : 'Artikel'} prüfen`,
    total: (n: number, sum: string) => `${n} Artikel · zusammen etwa ${sum}`,
    writeAll: 'Alle Anzeigen schreiben',
    writing: 'Wird geschrieben…',
    identifying: 'Wird erkannt…',
    valuing: 'Markt wird geprüft…',
    queued: 'Wartet',
    notFound: 'Nicht erkannt. Versuch ein klareres Foto oder prüf ihn einzeln.',
    needsBrand: 'Keine Marke auf dem Foto. Gib sie vom Etikett ein:',
    brandPh: 'Marke',
    check: 'Prüfen',
    notEnough: 'Zu wenige Angebote für einen Preis',
    sellsFor: (p: string, where: string) => `etwa ${p} auf ${where}`,
    quick: (p: string) => `Schnellverkauf ${p}`,
    details: 'Details',
    listing: 'Anzeige schreiben',
    hideListing: 'Anzeige ausblenden',
    showListing: 'Anzeige zeigen',
    remove: 'Entfernen',
    clear: 'Neu anfangen',
    upgrade: 'Tarife ansehen',
  },
  it: {
    title: 'Tanti articoli insieme',
    lead: 'Stai svuotando l’armadio o una scatola? Aggiungi una foto per articolo, se puoi con l’etichetta visibile. Li valutiamo uno per uno e scriviamo gli annunci.',
    gallery: 'Scegli le foto',
    camera: 'Scatta una foto',
    count: (n: number) => `${n} di ${MAX_BATCH} articoli`,
    usesChecks: (n: number, left: number | null) => `Usa ${n} ${n === 1 ? 'controllo' : 'controlli'}${left !== null ? `, te ne restano ${left}` : ''}.`,
    start: (n: number) => `Controlla ${n} ${n === 1 ? 'articolo' : 'articoli'}`,
    total: (n: number, sum: string) => `${n} ${n === 1 ? 'articolo' : 'articoli'} · circa ${sum} in tutto`,
    writeAll: 'Scrivi tutti gli annunci',
    writing: 'Scrittura…',
    identifying: 'Riconoscimento…',
    valuing: 'Controllo il mercato…',
    queued: 'In attesa',
    notFound: 'Non riconosciuto. Prova una foto più chiara o controllalo da solo.',
    needsBrand: 'Nessuna marca nella foto. Scrivila dall’etichetta:',
    brandPh: 'Marca',
    check: 'Controlla',
    notEnough: 'Annunci insufficienti per un prezzo',
    sellsFor: (p: string, where: string) => `circa ${p} su ${where}`,
    quick: (p: string) => `vendita rapida ${p}`,
    details: 'Dettagli',
    listing: 'Scrivi annuncio',
    hideListing: 'Nascondi annuncio',
    showListing: 'Mostra annuncio',
    remove: 'Rimuovi',
    clear: 'Ricomincia',
    upgrade: 'Vedi i piani',
  },
  fr: {
    title: 'Plusieurs articles d’un coup',
    lead: 'Tu vides ton armoire ou un carton ? Ajoute une photo par article, avec l’étiquette visible si possible. On estime chacun et on rédige les annonces.',
    gallery: 'Choisir des photos',
    camera: 'Prendre une photo',
    count: (n: number) => `${n} sur ${MAX_BATCH} articles`,
    usesChecks: (n: number, left: number | null) => `Utilise ${n} ${n === 1 ? 'vérification' : 'vérifications'}${left !== null ? `, il t’en reste ${left}` : ''}.`,
    start: (n: number) => `Vérifier ${n} ${n === 1 ? 'article' : 'articles'}`,
    total: (n: number, sum: string) => `${n} ${n === 1 ? 'article' : 'articles'} · environ ${sum} au total`,
    writeAll: 'Rédiger toutes les annonces',
    writing: 'Rédaction…',
    identifying: 'Reconnaissance…',
    valuing: 'Vérification du marché…',
    queued: 'En attente',
    notFound: 'Non reconnu. Essaie une photo plus nette ou vérifie-le seul.',
    needsBrand: 'Aucune marque sur la photo. Saisis-la depuis l’étiquette :',
    brandPh: 'Marque',
    check: 'Vérifier',
    notEnough: 'Pas assez d’annonces pour un prix',
    sellsFor: (p: string, where: string) => `environ ${p} sur ${where}`,
    quick: (p: string) => `vente rapide ${p}`,
    details: 'Détails',
    listing: 'Rédiger l’annonce',
    hideListing: 'Masquer l’annonce',
    showListing: 'Voir l’annonce',
    remove: 'Retirer',
    clear: 'Recommencer',
    upgrade: 'Voir les offres',
  },
});

type Cur = 'EUR' | 'GBP';

interface Props {
  settings: Settings;
  /** Checks left this month (null: unknown or unlimited). */
  checksLeft: number | null;
  onOpen: (item: BatchItem) => void;
  onUpgrade: () => void;
}

export function Batch({ settings, checksLeft, onOpen, onUpgrade }: Props) {
  const items = useBatch();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [writingAll, setWritingAll] = useState(false);
  const queued = items.filter((x) => x.status === 'queued' && !x.draft).length;
  const busy = items.some((x) => x.status === 'identifying' || x.status === 'valuing');
  const done = items.filter((x) => x.status === 'done' && x.resp?.result.status === 'ok');
  const currency = (done[0]?.resp?.result.status === 'ok' ? done[0].resp.result.estimate.currency : 'EUR') as Cur;
  const sum = done.reduce((a, x) => a + (x.resp?.result.status === 'ok' ? x.resp.result.estimate.expected.amountMinor : 0), 0);
  const blocked = items.some((x) => x.status === 'no_checks');

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX_BATCH - items.length);
    e.target.value = '';
    if (files.length > 0) addPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
  }

  function start() {
    track('batch_started', { items: queued });
    run(settings);
  }

  async function all() {
    setWritingAll(true);
    try {
      await writeAllListings(settings);
    } finally {
      setWritingAll(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{T.title}</h1>
      <p className="muted">{T.lead}</p>

      {items.length < MAX_BATCH && (
        <div className="row2 batch-add">
          <button type="button" className="ghost" onClick={() => galleryRef.current?.click()}><IconImage size={18} /> {T.gallery}</button>
          <button type="button" className="ghost" onClick={() => cameraRef.current?.click()}><IconCamera size={18} /> {T.camera}</button>
        </div>
      )}
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e)} />
      {items.length > 0 && <p className="muted small">{T.count(items.length)}</p>}

      {queued > 0 && !busy && (
        <div className="batch-start">
          <p className="muted small">{T.usesChecks(queued, checksLeft)}</p>
          <button type="button" className="primary wide" onClick={start} disabled={checksLeft === 0}>{T.start(queued)}</button>
        </div>
      )}

      {done.length > 0 && (
        <section className="card batch-total">
          <strong>{T.total(done.length, money(sum, 0, currency))}</strong>
          {done.some((x) => !x.listing) && (
            <button type="button" className="primary wide" onClick={() => void all()} disabled={writingAll}>
              <IconSpark size={18} /> {writingAll ? T.writing : T.writeAll}
            </button>
          )}
        </section>
      )}
      {blocked && <button type="button" className="ghost wide" onClick={onUpgrade}>{T.upgrade}</button>}

      <ul className="batch-list">
        {items.map((it) => <Row key={it.id} it={it} settings={settings} onOpen={onOpen} />)}
      </ul>

      {items.length > 0 && !busy && <button type="button" className="link" onClick={clearBatch}>{T.clear}</button>}
    </div>
  );
}

function Row({ it, settings, onOpen }: { it: BatchItem; settings: Settings; onOpen: (item: BatchItem) => void }) {
  const [brand, setBrandText] = useState('');
  const [open, setOpen] = useState(true);
  const p = it.draft?.product;
  const r = it.resp?.result;
  const where = it.resp ? presetText(it.resp.feePreset.id, FEE_PRESETS[it.resp.feePreset.id]).label.replace(/\s*\(.*\)$/, '') : '';

  return (
    <li className="batch-row">
      <div className="batch-head">
        <img src={it.photo} alt="" />
        <div className="batch-info">
          {p && (p.brand || p.model) ? <strong>{`${p.brand} ${p.model}`.trim()}</strong> : null}
          {it.status === 'queued' && <span className="muted small">{T.queued}</span>}
          {it.status === 'identifying' && <span className="muted small"><span className="spinner" aria-hidden="true" /> {T.identifying}</span>}
          {it.status === 'valuing' && <span className="muted small"><span className="spinner" aria-hidden="true" /> {T.valuing}</span>}
          {it.status === 'not_found' && <span className="muted small">{T.notFound}</span>}
          {(it.status === 'failed' || it.status === 'no_checks') && <span className="small bad-text">{it.error}</span>}
          {it.status === 'done' && r?.status === 'ok' && (
            <>
              <span className="batch-price">{T.sellsFor(money(r.estimate.expected.amountMinor, 0, r.estimate.currency as Cur), where)}</span>
              <span className="muted small">{T.quick(money(r.estimate.fast.amountMinor, 0, r.estimate.currency as Cur))}</span>
            </>
          )}
          {it.status === 'done' && r?.status !== 'ok' && <span className="muted small">{T.notEnough}</span>}
        </div>
        <button type="button" className="batch-x" aria-label={T.remove} onClick={() => removeItem(it.id)}>×</button>
      </div>

      {it.status === 'needs_brand' && (
        <form
          className="batch-brand"
          onSubmit={(e) => {
            e.preventDefault();
            setBrand(it.id, brand, settings);
          }}
        >
          <span className="hint warn">{T.needsBrand}</span>
          <div className="row2">
            <input value={brand} onChange={(e) => setBrandText(e.target.value)} placeholder={T.brandPh} autoCapitalize="words" />
            <button type="submit" className="ghost" disabled={!brand.trim()}>{T.check}</button>
          </div>
        </form>
      )}

      {it.status === 'done' && (
        <div className="batch-actions">
          <button type="button" className="link" onClick={() => onOpen(it)}>{T.details}</button>
          {!it.listing && (
            <button type="button" className="link" disabled={it.listingBusy} onClick={() => void writeListing(it.id, settings).catch(() => undefined)}>
              {it.listingBusy ? T.writing : T.listing}
            </button>
          )}
          {it.listing && <button type="button" className="link" onClick={() => setOpen((o) => !o)}>{open ? T.hideListing : T.showListing}</button>}
        </div>
      )}
      {it.listingError && <p className="small bad-text">{it.listingError}</p>}
      {it.listing && open && (
        <ListingResult
          listing={{ ...it.listing, suggestedPriceMinor: r?.status === 'ok' ? r.estimate.expected.amountMinor : null }}
          marketName={it.listing.marketplace === 'ebay' ? 'eBay' : 'Vinted'}
          busy={!!it.listingBusy}
          onRegenerate={() => void writeListing(it.id, settings).catch(() => undefined)}
        />
      )}
    </li>
  );
}
