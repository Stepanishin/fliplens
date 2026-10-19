import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CATEGORIES, CONDITIONS, FASHION_CATEGORY_OF, FASHION_GENDERS, FASHION_KINDS, type CategorySlug, type FashionAttributes, type FashionGender, type FashionKind } from '@fliplens/core';
import { Candidates } from '../Candidates.js';
import { api } from '../api.js';
import { CAPACITY_OPTIONS, hasIdentity, MOUNT_CATEGORIES, showsCapacity, showsFashion, type Draft, type ProductDraft } from '../flow.js';
import { CATEGORY_NAME, CONDITION_HINT, CONDITION_LABEL, FASHION_GENDER_NAME, FASHION_KIND_NAME } from '../format.js';
import { resizeToJpegDataUrl } from '../image.js';
import { tr } from '../i18n.js';
import { IconCamera } from '../ui/icons.js';

const T = tr({
  en: {
    whatIsIt: 'What is it?',
    isRight: 'Is this right?',
    photo: (n: number) => `Photo ${n}`,
    removePhoto: 'Remove photo',
    addLabel: 'Add a photo of the label',
    label: 'Label',
    barcodeLookup: 'Looking up the barcode…',
    identifying: 'Identifying the model…',
    matching: 'Matching listings',
    readOn: 'Read on item',
    barcodeUnclear: 'Barcode found, but the product is unclear. Type the model below.',
    noneRecognised: 'No product recognised. Add a photo of the label or type the model below.',
    eanExtra: (gtin: string, n: number | undefined) => `EAN ${gtin} · ${n} eBay listings`,
    corrected: 'Corrected by you. Corrections help recognition get better.',
    brand: 'Brand',
    category: 'Category',
    auto: 'Auto-detect',
    model: 'Model',
    detecting: 'Detecting category…',
    detected: "Category detected automatically. Change it if it's wrong.",
    storage: 'Storage',
    notSure: 'Not sure',
    other: 'Other',
    otherPlaceholder: 'e.g. 32GB',
    otherStorage: 'Other storage size',
    storageOnly: 'Only listings with this storage are compared.',
    storageAll: 'All storage versions are compared. Pick one if you know it for a more precise price.',
    mount: 'Mount',
    exclude: 'Similar models to exclude',
    comma: 'Comma separated',
    condition: 'Condition',
    suggested: (c: string) => ` (suggested: ${c})`,
    cont: 'Continue',
    item: "Item",
    kind: "Type",
    gender: "For",
    choose: "Choose…",
    style: "Line or style (optional)",
    stylePh: "e.g. Air Force 1, 501, Nuptse",
    styleHint: "Only listings with this name are compared. Leave empty to compare the brand and type.",
    noBrand: "No brand found. Type it from the label, or add a photo of the label.",
    fashionHint: "Clothes are priced by brand, type and condition, from eBay listings in your market.",
  },
  de: {
    whatIsIt: 'Was ist es?',
    isRight: 'Stimmt das?',
    photo: (n: number) => `Foto ${n}`,
    removePhoto: 'Foto entfernen',
    addLabel: 'Foto vom Etikett hinzufügen',
    label: 'Etikett',
    barcodeLookup: 'Barcode wird gesucht…',
    identifying: 'Modell wird erkannt…',
    matching: 'Passende Angebote',
    readOn: 'Auf dem Artikel gelesen',
    barcodeUnclear: 'Barcode gefunden, aber das Produkt ist unklar. Gib das Modell unten ein.',
    noneRecognised: 'Kein Produkt erkannt. Füg ein Foto vom Etikett hinzu oder gib das Modell unten ein.',
    eanExtra: (gtin: string, n: number | undefined) => `EAN ${gtin} · ${n} eBay-Angebote`,
    corrected: 'Von dir korrigiert. Korrekturen verbessern die Erkennung.',
    brand: 'Marke',
    category: 'Kategorie',
    auto: 'Automatisch erkennen',
    model: 'Modell',
    detecting: 'Kategorie wird erkannt…',
    detected: 'Kategorie automatisch erkannt. Ändere sie, falls sie falsch ist.',
    storage: 'Speicher',
    notSure: 'Weiß nicht',
    other: 'Andere',
    otherPlaceholder: 'z. B. 32GB',
    otherStorage: 'Andere Speichergröße',
    storageOnly: 'Nur Angebote mit diesem Speicher werden verglichen.',
    storageAll: 'Alle Speichervarianten werden verglichen. Wähl eine aus, wenn du sie kennst, für einen genaueren Preis.',
    mount: 'Anschluss',
    exclude: 'Ähnliche Modelle ausschließen',
    comma: 'Durch Komma getrennt',
    condition: 'Zustand',
    suggested: (c: string) => ` (Vorschlag: ${c})`,
    cont: 'Weiter',
    item: "Artikel",
    kind: "Art",
    gender: "Für",
    choose: "Auswählen…",
    style: "Linie oder Modell (optional)",
    stylePh: "z. B. Air Force 1, 501, Nuptse",
    styleHint: "Nur Angebote mit diesem Namen werden verglichen. Leer lassen, um Marke und Art zu vergleichen.",
    noBrand: "Keine Marke gefunden. Gib sie vom Etikett ein oder füg ein Foto vom Etikett hinzu.",
    fashionHint: "Kleidung wird nach Marke, Art und Zustand bewertet, anhand von eBay-Angeboten in deinem Markt.",
  },
  it: {
    whatIsIt: 'Che cos’è?',
    isRight: 'È giusto?',
    photo: (n: number) => `Foto ${n}`,
    removePhoto: 'Rimuovi foto',
    addLabel: 'Aggiungi una foto dell’etichetta',
    label: 'Etichetta',
    barcodeLookup: 'Cerco il codice a barre…',
    identifying: 'Riconosco il modello…',
    matching: 'Annunci corrispondenti',
    readOn: 'Letto sull’articolo',
    barcodeUnclear: 'Codice a barre trovato, ma il prodotto non è chiaro. Inserisci il modello qui sotto.',
    noneRecognised: 'Nessun prodotto riconosciuto. Aggiungi una foto dell’etichetta o inserisci il modello qui sotto.',
    eanExtra: (gtin: string, n: number | undefined) => `EAN ${gtin} · ${n} annunci eBay`,
    corrected: 'Corretto da te. Le correzioni aiutano a migliorare il riconoscimento.',
    brand: 'Marca',
    category: 'Categoria',
    auto: 'Rilevamento automatico',
    model: 'Modello',
    detecting: 'Rilevo la categoria…',
    detected: 'Categoria rilevata automaticamente. Cambiala se è sbagliata.',
    storage: 'Memoria',
    notSure: 'Non so',
    other: 'Altro',
    otherPlaceholder: 'es. 32GB',
    otherStorage: 'Altra capacità di memoria',
    storageOnly: 'Vengono confrontati solo gli annunci con questa memoria.',
    storageAll: 'Vengono confrontate tutte le versioni di memoria. Scegline una se la conosci, per un prezzo più preciso.',
    mount: 'Attacco',
    exclude: 'Modelli simili da escludere',
    comma: 'Separati da virgola',
    condition: 'Condizione',
    suggested: (c: string) => ` (suggerita: ${c})`,
    cont: 'Continua',
    item: "Articolo",
    kind: "Tipo",
    gender: "Per",
    choose: "Scegli…",
    style: "Linea o modello (facoltativo)",
    stylePh: "es. Air Force 1, 501, Nuptse",
    styleHint: "Vengono confrontati solo gli annunci con questo nome. Lascia vuoto per confrontare marca e tipo.",
    noBrand: "Nessuna marca trovata. Scrivila dall’etichetta o aggiungi una foto dell’etichetta.",
    fashionHint: "I capi vengono valutati per marca, tipo e condizione, dagli annunci eBay del tuo mercato.",
  },
  fr: {
    whatIsIt: 'Qu’est-ce que c’est ?',
    isRight: 'C’est bien ça ?',
    photo: (n: number) => `Photo ${n}`,
    removePhoto: 'Supprimer la photo',
    addLabel: 'Ajouter une photo de l’étiquette',
    label: 'Étiquette',
    barcodeLookup: 'Recherche du code-barres…',
    identifying: 'Identification du modèle…',
    matching: 'Annonces correspondantes',
    readOn: 'Lu sur l’article',
    barcodeUnclear: 'Code-barres trouvé, mais le produit n’est pas clair. Saisis le modèle ci-dessous.',
    noneRecognised: 'Aucun produit reconnu. Ajoute une photo de l’étiquette ou saisis le modèle ci-dessous.',
    eanExtra: (gtin: string, n: number | undefined) => `EAN ${gtin} · ${n} annonces eBay`,
    corrected: 'Corrigé par toi. Les corrections aident à améliorer la reconnaissance.',
    brand: 'Marque',
    category: 'Catégorie',
    auto: 'Détection automatique',
    model: 'Modèle',
    detecting: 'Détection de la catégorie…',
    detected: 'Catégorie détectée automatiquement. Change-la si elle est fausse.',
    storage: 'Stockage',
    notSure: 'Je ne sais pas',
    other: 'Autre',
    otherPlaceholder: 'ex. 32GB',
    otherStorage: 'Autre capacité de stockage',
    storageOnly: 'Seules les annonces avec ce stockage sont comparées.',
    storageAll: 'Toutes les versions de stockage sont comparées. Choisis-en une si tu la connais, pour un prix plus précis.',
    mount: 'Monture',
    exclude: 'Modèles similaires à exclure',
    comma: 'Séparés par des virgules',
    condition: 'État',
    suggested: (c: string) => ` (suggéré : ${c})`,
    cont: 'Continuer',
    item: "Article",
    kind: "Type",
    gender: "Pour",
    choose: "Choisir…",
    style: "Ligne ou modèle (facultatif)",
    stylePh: "ex. Air Force 1, 501, Nuptse",
    styleHint: "Seules les annonces avec ce nom sont comparées. Laisse vide pour comparer la marque et le type.",
    noBrand: "Aucune marque trouvée. Saisis-la depuis l’étiquette ou ajoute une photo de l’étiquette.",
    fashionHint: "Les vêtements sont estimés selon la marque, le type et l’état, à partir des annonces eBay de ton marché.",
  },
});

interface Props {
  draft: Draft;
  identifying: boolean;
  error: string | null;
  onChangeProduct: (p: Partial<ProductDraft>) => void;
  onDetectedCategory: (c: CategorySlug, fashion?: FashionAttributes) => void;
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
          if (!cancelled && res.category) onDetectedCategory(res.category, res.fashion);
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

  const fashion = showsFashion(p.category);
  const capacityOptions = p.category ? CAPACITY_OPTIONS[p.category] ?? [] : [];
  const capacityIsOther = p.capacity !== '' && !capacityOptions.includes(p.capacity.toUpperCase().replace(/\s/g, ''));

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3 - draft.photos.length);
    e.target.value = '';
    if (files.length > 0) onAddPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{draft.method === 'manual' ? T.whatIsIt : T.isRight}</h1>

      {draft.method === 'photo' && (
        <div className="thumbs">
          {draft.photos.map((src, i) => (
            <div key={i} className="thumb">
              <img src={src} alt={T.photo(i + 1)} />
              <button type="button" aria-label={T.removePhoto} onClick={() => onRemovePhoto(i)}>×</button>
            </div>
          ))}
          {draft.photos.length < 3 && (
            <button type="button" className="thumb add" onClick={() => addRef.current?.click()} aria-label={T.addLabel}>
              <IconCamera size={20} />
              <span>{T.label}</span>
            </button>
          )}
          <input ref={addRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
        </div>
      )}

      {identifying && (
        <div className="identifying" role="status">
          <span className="spinner" aria-hidden="true" />
          {draft.method === 'barcode' ? T.barcodeLookup : T.identifying}
        </div>
      )}
      {error && <div className="banner bad">{error}</div>}

      {r && !identifying && (
        <Candidates
          result={r}
          picked={draft.chosenIndex}
          onChoose={onPickCandidate}
          evidenceLabel={r.gtin ? T.matching : T.readOn}
          emptyText={r.gtin ? T.barcodeUnclear : T.noneRecognised}
          {...(r.gtin && { extra: T.eanExtra(r.gtin, r.listingCount) })}
        />
      )}

      <section className="card form-card">
        {draft.edited && <p className="muted small">{T.corrected}</p>}
        <div className="row2">
          <label className="field">
            <span>{T.brand}</span>
            <input value={p.brand} onChange={(e) => onChangeProduct({ brand: e.target.value })} placeholder={fashion ? 'Zara' : 'Sony'} autoCapitalize="words" />
          </label>
          <label className="field">
            <span>{T.category}</span>
            <select value={p.category} onChange={(e) => onChangeProduct({ category: e.target.value as CategorySlug | '', categoryAuto: false })}>
              <option value="">{T.auto}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL(c)}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>{fashion ? T.item : T.model}</span>
          <input value={p.model} onChange={(e) => onChangeProduct({ model: e.target.value })} placeholder={fashion ? 'cargo shorts' : 'WH-1000XM4'} />
        </label>
        {fashion && !p.brand.trim() && p.model.trim() !== '' && <p className="hint warn">{T.noBrand}</p>}
        {fashion && (
          <>
            <div className="row2">
              <label className="field">
                <span>{T.kind}</span>
                <select
                  value={p.fashionKind}
                  onChange={(e) => {
                    const kind = e.target.value as FashionKind | '';
                    onChangeProduct({ fashionKind: kind, ...(kind && { category: FASHION_CATEGORY_OF[kind], categoryAuto: false }) });
                  }}
                >
                  <option value="">{T.choose}</option>
                  {FASHION_KINDS.map((k) => <option key={k} value={k}>{FASHION_KIND_NAME[k]}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{T.gender}</span>
                <select value={p.gender} onChange={(e) => onChangeProduct({ gender: e.target.value as FashionGender | '' })}>
                  <option value="">{T.choose}</option>
                  {FASHION_GENDERS.map((g) => <option key={g} value={g}>{FASHION_GENDER_NAME[g]}</option>)}
                </select>
              </label>
            </div>
            <label className="field">
              <span>{T.style}</span>
              <input value={p.style} onChange={(e) => onChangeProduct({ style: e.target.value })} placeholder={T.stylePh} />
              <span className="hint">{p.style.trim() ? T.styleHint : T.fashionHint}</span>
            </label>
          </>
        )}
        {detecting && <p className="hint">{T.detecting}</p>}
        {!detecting && p.categoryAuto && <p className="hint">{T.detected}</p>}
        {showsCapacity(p.category) && (
          <div className="field">
            <span id="cap-label">{T.storage}</span>
            <div className="chips-row" role="radiogroup" aria-labelledby="cap-label">
              <button type="button" role="radio" aria-checked={p.capacity === '' && !otherCapacity} className={`chip-btn ${p.capacity === '' && !otherCapacity ? 'on' : ''}`} onClick={() => { setOtherCapacity(false); onChangeProduct({ capacity: '' }); }}>
                {T.notSure}
              </button>
              {capacityOptions.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={p.capacity === c} className={`chip-btn ${p.capacity === c ? 'on' : ''}`} onClick={() => { setOtherCapacity(false); onChangeProduct({ capacity: c }); }}>
                  {c.replace(/(\d)(GB|TB)/, '$1 $2')}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={otherCapacity || capacityIsOther} className={`chip-btn ${otherCapacity || capacityIsOther ? 'on' : ''}`} onClick={() => setOtherCapacity(true)}>
                {T.other}
              </button>
            </div>
            {(otherCapacity || capacityIsOther) && (
              <input value={p.capacity} onChange={(e) => onChangeProduct({ capacity: e.target.value })} placeholder={T.otherPlaceholder} aria-label={T.otherStorage} />
            )}
            <span className="hint">{p.capacity ? T.storageOnly : T.storageAll}</span>
          </div>
        )}
        {p.category !== '' && MOUNT_CATEGORIES.includes(p.category) && (
          <label className="field">
            <span>{T.mount}</span>
            <input value={p.mount} onChange={(e) => onChangeProduct({ mount: e.target.value })} placeholder="RF, EF, EF-S, FE" />
          </label>
        )}
        {!fashion && <details className="adv">
          <summary>{T.exclude}{p.excludeModels ? `: ${p.excludeModels}` : ''}</summary>
          <label className="field">
            <span>{T.comma}</span>
            <input value={p.excludeModels} onChange={(e) => onChangeProduct({ excludeModels: e.target.value })} placeholder="WH-1000XM5, WH-1000XM3" />
          </label>
        </details>}

        <div className="field">
          <span id="cond-label">{T.condition}{r?.conditionGuess ? T.suggested(CONDITION_LABEL[r.conditionGuess]) : ''}</span>
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
          {T.cont}
        </button>
      </div>
    </div>
  );
}
