import { useEffect, useState, type ChangeEvent } from 'react';
import type { Condition } from '@fliplens/core';
import { api, type EbayAspect, type EbayMarket, type EbayPrepare } from '../api.js';
import { CONDITION_LABEL } from '../format.js';
import { errorText, LANG, tr } from '../i18n.js';
import { resizeToJpegDataUrl } from '../image.js';
import { loadSettings, type Settings } from '../storage.js';
import { track } from '../track.js';

/**
 * Publish a written listing on eBay (ADR-025): connect the eBay account once (popup, so this sheet and its photos
 * survive), check title, price, category, required item specifics, condition and shipping, then one tap creates the
 * live listing on the seller's own account.
 */

const T = tr({
  en: {
    button: 'Publish on eBay',
    title: 'Publish on eBay',
    connectLead: 'Connect your eBay seller account once. FlipLens then creates the listing on your account; you can edit or end it on eBay at any time.',
    connect: 'Connect eBay',
    waiting: 'Finish the sign-in in the eBay window…',
    connectedAs: (u: string) => `Connected as ${u}`,
    disconnect: 'Disconnect',
    site: 'eBay site',
    listingTitle: 'Title',
    chars: (n: number) => `${n}/80`,
    description: 'Description',
    price: 'Price',
    condition: 'Condition',
    category: 'Category',
    noCategory: 'eBay found no category for this title. Make the title more specific (brand and model).',
    specifics: 'Required item specifics',
    choose: 'Choose…',
    shipping: 'Shipping (your eBay shipping policy)',
    noShipping: 'Your eBay account has no shipping policy for this site yet. Create one on eBay (My eBay, Account, Business policies, Create policy, Shipping), then reload this sheet.',
    reload: 'Reload',
    postal: 'Ships from (postal code)',
    photos: 'Photos',
    addPhoto: 'Add photo',
    needPhoto: 'eBay needs at least one photo.',
    publish: 'Publish now',
    publishing: 'Publishing on eBay…',
    done: 'Your listing is live on eBay.',
    view: 'View on eBay',
    failed: (m: string) => `eBay did not accept the listing: ${m}`,
    notAvailable: 'Publishing on eBay is not available yet.',
    close: 'Close',
    note: 'Listed as a fixed price offer, quantity 1. Payment and return settings: your eBay defaults (FlipLens creates simple ones if you have none).',
  },
  de: {
    button: 'Auf eBay veröffentlichen',
    title: 'Auf eBay veröffentlichen',
    connectLead: 'Verbinde einmal dein eBay-Verkäuferkonto. FlipLens erstellt das Angebot dann in deinem Konto; du kannst es jederzeit auf eBay bearbeiten oder beenden.',
    connect: 'eBay verbinden',
    waiting: 'Schließ die Anmeldung im eBay-Fenster ab…',
    connectedAs: (u: string) => `Verbunden als ${u}`,
    disconnect: 'Trennen',
    site: 'eBay-Seite',
    listingTitle: 'Titel',
    chars: (n: number) => `${n}/80`,
    description: 'Beschreibung',
    price: 'Preis',
    condition: 'Zustand',
    category: 'Kategorie',
    noCategory: 'eBay hat keine Kategorie für diesen Titel gefunden. Mach den Titel genauer (Marke und Modell).',
    specifics: 'Pflicht-Artikelmerkmale',
    choose: 'Auswählen…',
    shipping: 'Versand (deine eBay-Versandrichtlinie)',
    noShipping: 'Dein eBay-Konto hat für diese Seite noch keine Versandrichtlinie. Leg eine auf eBay an (Mein eBay, Konto, Rahmenbedingungen, Rahmenbedingung erstellen, Versand) und lade dieses Fenster neu.',
    reload: 'Neu laden',
    postal: 'Artikelstandort (Postleitzahl)',
    photos: 'Fotos',
    addPhoto: 'Foto hinzufügen',
    needPhoto: 'eBay braucht mindestens ein Foto.',
    publish: 'Jetzt veröffentlichen',
    publishing: 'Wird auf eBay veröffentlicht…',
    done: 'Dein Angebot ist auf eBay online.',
    view: 'Auf eBay ansehen',
    failed: (m: string) => `eBay hat das Angebot nicht angenommen: ${m}`,
    notAvailable: 'Veröffentlichen auf eBay ist noch nicht verfügbar.',
    close: 'Schließen',
    note: 'Als Sofort-Kaufen-Angebot, Menge 1. Zahlung und Rücknahme: deine eBay-Einstellungen (FlipLens legt einfache an, falls du keine hast).',
  },
  it: {
    button: 'Pubblica su eBay',
    title: 'Pubblica su eBay',
    connectLead: "Collega una volta il tuo account venditore eBay. FlipLens crea poi l'annuncio nel tuo account; puoi modificarlo o chiuderlo su eBay quando vuoi.",
    connect: 'Collega eBay',
    waiting: "Completa l'accesso nella finestra di eBay…",
    connectedAs: (u: string) => `Collegato come ${u}`,
    disconnect: 'Scollega',
    site: 'Sito eBay',
    listingTitle: 'Titolo',
    chars: (n: number) => `${n}/80`,
    description: 'Descrizione',
    price: 'Prezzo',
    condition: 'Condizione',
    category: 'Categoria',
    noCategory: 'eBay non ha trovato una categoria per questo titolo. Rendi il titolo più preciso (marca e modello).',
    specifics: 'Caratteristiche obbligatorie',
    choose: 'Scegli…',
    shipping: 'Spedizione (la tua regola di spedizione eBay)',
    noShipping: 'Il tuo account eBay non ha ancora una regola di spedizione per questo sito. Creane una su eBay (Il mio eBay, Account, Regole per le inserzioni, Crea regola, Spedizione), poi ricarica.',
    reload: 'Ricarica',
    postal: 'Spedito da (CAP)',
    photos: 'Foto',
    addPhoto: 'Aggiungi foto',
    needPhoto: 'eBay richiede almeno una foto.',
    publish: 'Pubblica ora',
    publishing: 'Pubblicazione su eBay…',
    done: 'Il tuo annuncio è online su eBay.',
    view: 'Vedi su eBay',
    failed: (m: string) => `eBay non ha accettato l'annuncio: ${m}`,
    notAvailable: 'La pubblicazione su eBay non è ancora disponibile.',
    close: 'Chiudi',
    note: 'Pubblicato a prezzo fisso, quantità 1. Pagamento e resi: le tue impostazioni eBay (FlipLens ne crea di semplici se non ne hai).',
  },
  fr: {
    button: 'Publier sur eBay',
    title: 'Publier sur eBay',
    connectLead: "Connecte une fois ton compte vendeur eBay. FlipLens crée ensuite l'annonce sur ton compte ; tu peux la modifier ou la retirer sur eBay à tout moment.",
    connect: 'Connecter eBay',
    waiting: 'Termine la connexion dans la fenêtre eBay…',
    connectedAs: (u: string) => `Connecté en tant que ${u}`,
    disconnect: 'Déconnecter',
    site: 'Site eBay',
    listingTitle: 'Titre',
    chars: (n: number) => `${n}/80`,
    description: 'Description',
    price: 'Prix',
    condition: 'État',
    category: 'Catégorie',
    noCategory: "eBay n'a trouvé aucune catégorie pour ce titre. Précise le titre (marque et modèle).",
    specifics: 'Caractéristiques obligatoires',
    choose: 'Choisir…',
    shipping: "Livraison (ta règle d'expédition eBay)",
    noShipping: "Ton compte eBay n'a pas encore de règle d'expédition pour ce site. Crées-en une sur eBay (Mon eBay, Compte, Règles de vente, Créer une règle, Expédition), puis recharge.",
    reload: 'Recharger',
    postal: 'Expédié depuis (code postal)',
    photos: 'Photos',
    addPhoto: 'Ajouter une photo',
    needPhoto: 'eBay demande au moins une photo.',
    publish: 'Publier maintenant',
    publishing: 'Publication sur eBay…',
    done: 'Ton annonce est en ligne sur eBay.',
    view: 'Voir sur eBay',
    failed: (m: string) => `eBay a refusé l'annonce : ${m}`,
    notAvailable: "La publication sur eBay n'est pas encore disponible.",
    close: 'Fermer',
    note: "Annonce à prix fixe, quantité 1. Paiement et retours : tes réglages eBay (FlipLens en crée de simples si tu n'en as pas).",
  },
});

const SITES: [EbayMarket, string][] = [['EBAY_DE', 'eBay.de'], ['EBAY_IT', 'eBay.it'], ['EBAY_FR', 'eBay.fr'], ['EBAY_GB', 'eBay.co.uk']];
const CONDITIONS: Condition[] = ['new', 'like_new', 'very_good', 'good', 'fair', 'poor', 'for_parts'];
const BRAND = /^(brand|marke|marca|marque)$/i;
const MODEL = /^(model|modell|modello|modèle)$/i;

export function defaultEbayMarket(s: Settings): EbayMarket {
  if (s.preset === 'ebay_it_private') return 'EBAY_IT';
  if (s.preset === 'ebay_fr_private') return 'EBAY_FR';
  if (s.preset === 'ebay_uk_private') return 'EBAY_GB';
  if (s.preset.startsWith('ebay_')) return 'EBAY_DE';
  return s.country === 'IT' ? 'EBAY_IT' : s.country === 'FR' ? 'EBAY_FR' : s.country === 'GB' ? 'EBAY_GB' : 'EBAY_DE';
}

export interface EbayDraft {
  title: string;
  description: string;
  priceMinor: number | null;
  photos: string[];
  brand?: string | null;
  model?: string | null;
  condition?: Condition | null;
  conditionNote?: string;
}

/** The "Publish on eBay" button; opens the sheet. Hidden when the server has no eBay publishing configured. */
export function EbayPublishButton({ draft }: { draft: EbayDraft }) {
  const settings = loadSettings();
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    void api.ebayAvailable().then(setAvailable);
  }, []);
  if (!available) return null;
  return (
    <>
      <button type="button" className="primary wide" onClick={() => { setOpen(true); track('ebay_publish_opened', {}); }}>{T.button}</button>
      {open && <EbayPublishSheet draft={draft} settings={settings} onClose={() => setOpen(false)} />}
    </>
  );
}

function EbayPublishSheet({ draft, settings, onClose }: { draft: EbayDraft; settings: Settings; onClose: () => void }) {
  const [status, setStatus] = useState<{ connected: boolean; username: string | null } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [market, setMarket] = useState<EbayMarket>(defaultEbayMarket(settings));
  const [prep, setPrep] = useState<EbayPrepare | null>(null);
  const [title, setTitle] = useState(draft.title.slice(0, 80));
  const [description, setDescription] = useState(draft.description);
  const [price, setPrice] = useState(draft.priceMinor ? String(Math.round(draft.priceMinor / 100)) : '');
  const [condition, setCondition] = useState<Condition>(draft.condition ?? 'good');
  const [categoryId, setCategoryId] = useState('');
  const [aspectDefs, setAspectDefs] = useState<EbayAspect[]>([]);
  const [aspects, setAspects] = useState<Record<string, string>>({});
  const [loadingAspects, setLoadingAspects] = useState(false);
  const [shippingId, setShippingId] = useState('');
  const [postal, setPostal] = useState('');
  const [photos, setPhotos] = useState<string[]>(draft.photos.slice(0, 8));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refreshStatus = () => api.ebayStatus().then((s) => { setStatus(s); return s; }, (e: unknown) => { setError(errorText(e)); return null; });
  useEffect(() => {
    void refreshStatus();
  }, []);

  // The eBay window reports back (postMessage from the callback page) or the user returns to this tab.
  useEffect(() => {
    if (!waiting) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && (e.data as { ebay?: string } | null)?.ebay) void refreshStatus().then((s) => s?.connected && setWaiting(false));
    };
    const timer = window.setInterval(() => void refreshStatus().then((s) => s?.connected && setWaiting(false)), 3000);
    window.addEventListener('message', onMsg);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('message', onMsg);
    };
  }, [waiting]);

  const loadPrep = () => {
    setPrep(null);
    setError(null);
    void api.ebayPrepare(market, title || draft.title).then(
      (p) => {
        setPrep(p);
        setCategoryId((c) => (p.categories.some((x) => x.id === c) ? c : p.categories[0]?.id ?? ''));
        setShippingId((s) => (p.shipping.some((x) => x.id === s) ? s : p.shipping[0]?.id ?? ''));
        setPostal((v) => v || p.postalCode || '');
      },
      (e: unknown) => setError(errorText(e)),
    );
  };
  useEffect(() => {
    if (status?.connected) loadPrep();
  }, [status?.connected, market]);

  useEffect(() => {
    if (!categoryId) return;
    setLoadingAspects(true);
    void api.ebayAspects(market, categoryId, title, description).then(
      ({ aspects: defs, suggested }) => {
        setLoadingAspects(false);
        setAspectDefs(defs);
        setAspects((old) => {
          const next: Record<string, string> = {};
          for (const d of defs) {
            const known = BRAND.test(d.name) ? draft.brand : MODEL.test(d.name) ? draft.model : undefined;
            const guess = known && (!d.selectionOnly || d.values.includes(known)) ? known : suggested[d.name];
            next[d.name] = old[d.name] || guess || '';
          }
          return next;
        });
      },
      (e: unknown) => {
        setLoadingAspects(false);
        setError(errorText(e));
      },
    );
  }, [categoryId, market]);

  async function connect() {
    setError(null);
    // Open the window synchronously (popup blockers), then point it at eBay.
    const w = window.open('', 'ebay-connect', 'width=520,height=720');
    try {
      const url = await api.ebayConnectUrl(LANG);
      if (w) w.location.href = url;
      else window.location.href = url;
      setWaiting(true);
      track('ebay_connect_started', {});
    } catch (e) {
      w?.close();
      setError(errorText(e));
    }
  }

  async function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 8 - photos.length);
    e.target.value = '';
    const added = await Promise.all(files.map((f) => resizeToJpegDataUrl(f, 1600, 0.85)));
    setPhotos((p) => [...p, ...added].slice(0, 8));
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.ebayPublish({
        marketplace: market,
        title: title.trim(),
        description: description.trim(),
        price: Number(price.replace(',', '.')),
        condition,
        ...(draft.conditionNote && { conditionNote: draft.conditionNote }),
        categoryId,
        aspects: Object.fromEntries(Object.entries(aspects).filter(([, v]) => v.trim()).map(([k, v]) => [k, [v.trim()]])),
        images: photos,
        fulfillmentPolicyId: shippingId,
        postalCode: postal.trim(),
        country: settings.country,
        business: settings.preset === 'ebay_de_business',
      });
      setDone(r.url);
      track('ebay_published', { marketplace: market });
    } catch (e) {
      const msg = (e as { message?: string }).message;
      setError((e as { code?: string }).code === 'ebay_error' && msg ? T.failed(msg) : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const missingAspect = aspectDefs.some((d) => !aspects[d.name]?.trim());
  const priceOk = Number(price.replace(',', '.')) > 0;
  const canPublish = Boolean(!loadingAspects && prep && title.trim().length >= 3 && description.trim() && priceOk && categoryId && shippingId && postal.trim().length >= 3 && photos.length > 0 && !missingAspect && !busy);

  return (
    <div className="sheet-backdrop" role="dialog" aria-label={T.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="card-head">
          <h2>{T.title}</h2>
          <button type="button" className="link" onClick={onClose}>{T.close}</button>
        </div>

        {done ? (
          <>
            <div className="banner ok">{T.done}</div>
            <a className="primary wide" href={done} target="_blank" rel="noreferrer">{T.view}</a>
          </>
        ) : !status ? (
          error ? <div className="banner bad">{error}</div> : <p className="muted">…</p>
        ) : !status.connected ? (
          <>
            <p className="muted">{T.connectLead}</p>
            {waiting ? <p className="muted small">{T.waiting}</p> : null}
            {error && <div className="banner bad">{error}</div>}
            <button type="button" className="primary wide" onClick={() => void connect()}>{T.connect}</button>
          </>
        ) : (
          <>
            <p className="muted small">
              {T.connectedAs(status.username ?? 'eBay')} ·{' '}
              <button type="button" className="link" onClick={() => void api.ebayDisconnect().then(() => setStatus({ connected: false, username: null }))}>{T.disconnect}</button>
            </p>
            <label className="field">
              <span>{T.site}</span>
              <select value={market} onChange={(e) => setMarket(e.target.value as EbayMarket)}>
                {SITES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{T.listingTitle} <span className="muted">{T.chars(title.length)}</span></span>
              <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} onBlur={() => prep && prep.categories.length === 0 && loadPrep()} />
            </label>
            <label className="field">
              <span>{T.description}</span>
              <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="ebay-row">
              <label className="field">
                <span>{T.price} ({market === 'EBAY_GB' ? '£' : '€'})</span>
                <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              <label className="field">
                <span>{T.condition}</span>
                <select value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
                </select>
              </label>
            </div>

            {!prep ? (
              error ? <div className="banner bad">{error}</div> : <p className="muted small">…</p>
            ) : (
              <>
                <label className="field">
                  <span>{T.category}</span>
                  {prep.categories.length ? (
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                      {prep.categories.map((c) => <option key={c.id} value={c.id}>{c.path}</option>)}
                    </select>
                  ) : (
                    <span className="muted small">{T.noCategory}</span>
                  )}
                </label>
                {aspectDefs.length > 0 && (
                  <fieldset className="ebay-aspects">
                    <legend className="muted small">{T.specifics}{loadingAspects ? ' …' : ''}</legend>
                    {aspectDefs.map((d) => (
                      <label key={d.name} className="field">
                        <span>{d.name}</span>
                        {d.selectionOnly && d.values.length ? (
                          <select value={aspects[d.name] ?? ''} onChange={(e) => setAspects({ ...aspects, [d.name]: e.target.value })}>
                            <option value="">{T.choose}</option>
                            {d.values.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : (
                          <>
                            <input list={`asp-${d.name}`} value={aspects[d.name] ?? ''} maxLength={65} onChange={(e) => setAspects({ ...aspects, [d.name]: e.target.value })} />
                            {d.values.length > 0 && <datalist id={`asp-${d.name}`}>{d.values.slice(0, 100).map((v) => <option key={v} value={v} />)}</datalist>}
                          </>
                        )}
                      </label>
                    ))}
                  </fieldset>
                )}
                <label className="field">
                  <span>{T.shipping}</span>
                  {prep.shipping.length ? (
                    <select value={shippingId} onChange={(e) => setShippingId(e.target.value)}>
                      {prep.shipping.map((p) => <option key={p.id} value={p.id}>{p.name}{p.description ? ` · ${p.description}` : ''}</option>)}
                    </select>
                  ) : (
                    <span className="muted small">
                      {T.noShipping} <button type="button" className="link" onClick={loadPrep}>{T.reload}</button>
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{T.postal}</span>
                  <input value={postal} maxLength={12} autoComplete="postal-code" onChange={(e) => setPostal(e.target.value)} />
                </label>
              </>
            )}

            <div className="field">
              <span>{T.photos} <span className="muted">{photos.length}/8</span></span>
              <div className="ql-photos">
                {photos.map((p, i) => (
                  <div key={i} className="ql-photo">
                    <img src={p} alt="" />
                    <button type="button" aria-label="×" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
              {photos.length < 8 && (
                <label className="ghost ebay-add">
                  {T.addPhoto}
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => void addPhotos(e)} />
                </label>
              )}
              {photos.length === 0 && <span className="muted small">{T.needPhoto}</span>}
            </div>

            {error && prep && <div className="banner bad">{error}</div>}
            <button type="button" className="primary wide" disabled={!canPublish} onClick={() => void publish()}>{busy ? T.publishing : T.publish}</button>
            <p className="muted small">{T.note}</p>
          </>
        )}
      </div>
    </div>
  );
}
