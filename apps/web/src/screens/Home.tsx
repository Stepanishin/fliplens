import { useRef, useState, type ChangeEvent } from 'react';
import type { Account, BillingInfo, ServerScan } from '../api.js';
import { scanPill } from '../format.js';
import { ago, money, tr } from '../i18n.js';
import { resizeToJpegDataUrl } from '../image.js';
import { IconBarcode, IconCamera, IconChevron, IconEdit, IconImage, IconRadar, IconSpark, IconTable } from '../ui/icons.js';
import { InstallApp } from '../ui/InstallApp.js';

interface Props {
  account: Account | null;
  visionEnabled: boolean;
  recent: ServerScan[] | null;
  onPhotos: (photos: string[]) => void;
  /** The "listing from a photo" tool (any item, e.g. clothes for Vinted). */
  onQuickListing: () => void;
  onRadar: () => void;
  /** One photo of a whole stall: every item valued. */
  onShelf: (photo: string) => void;
  onCamera: () => void;
  onBarcode: () => void;
  onManual: () => void;
  onOpenScan: (s: ServerScan) => void;
  onSeeHistory: () => void;
  quota: BillingInfo['quota'] | null;
  onOpenPlans: () => void;
}

const T = tr({
  en: {
    radarTitle: 'Live radar',
    radarSub: 'Keep the camera open: items get a box, tap one for its price.',
    shelfTitle: 'Scan a whole table',
    shelfSub: 'One photo of a stall or box: see what is worth buying.',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    photoError: 'Could not read the photo',
    title: 'Should I buy it?',
    lead: 'Snap the item, enter the price. We check the European resale market for you.',
    scan: 'Scan item',
    barcode: 'Barcode',
    gallery: 'Gallery',
    type: 'Type it',
    visionOff: 'Photo and barcode recognition are off on the server.',
    toolTitle: 'Selling something? Write the listing from a photo',
    toolSub: 'Title and description for Vinted, eBay or Kleinanzeigen. Clothes too.',
    checksLeft: (n: number) => `${n} free checks left`,
    used: (u: number, l: number) => `this month · ${u}/${l} used`,
    upgrade: 'Upgrade',
    recent: 'Recent checks',
    seeAll: 'See all',
    s1: 'Scan',
    s1t: 'Photo, barcode or type the model.',
    s2: 'Enter the price',
    s2t: 'What the seller asks for it.',
    s3: 'Get the verdict',
    s3t: 'Resale value, profit, ROI, from real listings.',
    worth: 'worth',
    na: 'n/a',
  },
  de: {
    radarTitle: 'Live-Radar',
    radarSub: 'Kamera offen lassen: Artikel bekommen einen Rahmen, tippen für den Preis.',
    shelfTitle: 'Ganzen Tisch scannen',
    shelfSub: 'Ein Foto vom Stand oder der Kiste: sieh sofort, was sich lohnt.',
    morning: 'Guten Morgen',
    afternoon: 'Guten Tag',
    evening: 'Guten Abend',
    photoError: 'Das Foto konnte nicht gelesen werden',
    title: 'Soll ich es kaufen?',
    lead: 'Fotografier den Artikel, gib den Preis ein. Wir prüfen den europäischen Wiederverkaufsmarkt für dich.',
    scan: 'Artikel scannen',
    barcode: 'Barcode',
    gallery: 'Galerie',
    type: 'Eintippen',
    visionOff: 'Foto- und Barcode-Erkennung sind auf dem Server ausgeschaltet.',
    toolTitle: 'Willst du etwas verkaufen? Schreib die Anzeige aus einem Foto',
    toolSub: 'Titel und Beschreibung für Vinted, eBay oder Kleinanzeigen. Auch für Kleidung.',
    checksLeft: (n: number) => `Noch ${n} kostenlose Checks`,
    used: (u: number, l: number) => `diesen Monat · ${u}/${l} genutzt`,
    upgrade: 'Upgrade',
    recent: 'Letzte Checks',
    seeAll: 'Alle ansehen',
    s1: 'Scannen',
    s1t: 'Foto, Barcode oder Modell eintippen.',
    s2: 'Preis eingeben',
    s2t: 'Was der Verkäufer dafür will.',
    s3: 'Ergebnis erhalten',
    s3t: 'Wiederverkaufswert, Gewinn, ROI, aus echten Angeboten.',
    worth: 'Wert',
    na: 'k. A.',
  },
});

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? T.morning : h < 18 ? T.afternoon : T.evening;
}

export function Home({ account, visionEnabled, recent, onPhotos, onQuickListing, onRadar, onShelf, onCamera, onBarcode, onManual, onOpenScan, onSeeHistory, quota, onOpenPlans }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const shelfRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const firstName = account?.name?.split(' ')[0];

  async function onShelfFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      // More pixels than a single item: small things on a table must stay readable.
      onShelf(await resizeToJpegDataUrl(file, 1600, 0.85));
    } catch (err) {
      setError(err instanceof Error ? err.message : T.photoError);
    }
  }

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    try {
      onPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
    } catch (err) {
      setError(err instanceof Error ? err.message : T.photoError);
    }
  }

  return (
    <div className="screen home">
      <p className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</p>

      <section className="hero-scan">
        <div className="hero-scan-text">
          <h1>{T.title}</h1>
          <p>{T.lead}</p>
        </div>
        <button type="button" className="hero-scan-btn" onClick={onCamera} disabled={!visionEnabled}>
          <IconCamera size={24} />
          {T.scan}
        </button>
        <div className="hero-scan-alt">
          <button type="button" onClick={onBarcode} disabled={!visionEnabled}><IconBarcode size={18} /> {T.barcode}</button>
          <button type="button" onClick={() => galleryRef.current?.click()} disabled={!visionEnabled}><IconImage size={18} /> {T.gallery}</button>
          <button type="button" onClick={onManual}><IconEdit size={18} /> {T.type}</button>
        </div>
      </section>
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {!visionEnabled && <p className="muted small center">{T.visionOff}</p>}
      {error && <div className="banner bad">{error}</div>}

      <button type="button" className="home-tool" onClick={() => shelfRef.current?.click()} disabled={!visionEnabled}>
        <span className="home-tool-icon"><IconTable size={20} /></span>
        <span style={{ flex: 1 }}>
          <strong>{T.shelfTitle}</strong>
          <span className="muted">{T.shelfSub}</span>
        </span>
        <IconChevron size={18} className="muted" />
      </button>
      <button type="button" className="home-tool" onClick={onRadar} disabled={!visionEnabled}>
        <span className="home-tool-icon"><IconRadar size={20} /></span>
        <span style={{ flex: 1 }}>
          <strong>{T.radarTitle}</strong>
          <span className="muted">{T.radarSub}</span>
        </span>
        <IconChevron size={18} className="muted" />
      </button>
      <input ref={shelfRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onShelfFile(e)} />

      <button type="button" className="home-tool" onClick={onQuickListing} disabled={!visionEnabled}>
        <span className="home-tool-icon"><IconSpark size={20} /></span>
        <span style={{ flex: 1 }}>
          <strong>{T.toolTitle}</strong>
          <span className="muted">{T.toolSub}</span>
        </span>
        <IconChevron size={18} className="muted" />
      </button>

      {quota && quota.plan === 'free' && (
        <button type="button" className="quota-card" onClick={onOpenPlans}>
          <span className="quota-text">
            <strong>{T.checksLeft(quota.remaining)}</strong>
            <span className="muted small">{T.used(quota.used, quota.limit)}</span>
          </span>
          <span className="quota-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%` }} /></span>
          <span className="link">{T.upgrade}</span>
        </button>
      )}

      <InstallApp variant="banner" />

      <section className="section">
        <div className="section-head">
          <h2>{T.recent}</h2>
          {recent && recent.length > 0 && <button type="button" className="link" onClick={onSeeHistory}>{T.seeAll}</button>}
        </div>
        {recent === null ? (
          <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div>
        ) : recent.length === 0 ? (
          <ol className="how">
            <li><span>1</span><div><strong>{T.s1}</strong><p className="muted small">{T.s1t}</p></div></li>
            <li><span>2</span><div><strong>{T.s2}</strong><p className="muted small">{T.s2t}</p></div></li>
            <li><span>3</span><div><strong>{T.s3}</strong><p className="muted small">{T.s3t}</p></div></li>
          </ol>
        ) : (
          <ul className="recent">
            {recent.slice(0, 4).map((s) => (
              <li key={s.id}>
                <button type="button" className={`recent-row v-${s.priceProvided === false ? 'value' : (s.valuation?.decision ?? 'insufficient')}`} onClick={() => onOpenScan(s)}>
                  <span className="recent-main">
                    <strong>{s.product.brand} {s.product.model}{s.product.capacity ? ` ${s.product.capacity}` : ''}</strong>
                    <span className="muted small">
                      {s.priceProvided === false ? T.worth : `${money(s.purchasePrice.amountMinor)} →`} {s.valuation?.expected ? money(s.valuation.expected) : T.na} · {ago(s.createdAt)}
                    </span>
                  </span>
                  <span className="recent-side">
                    <span className={`pill ${scanPill(s).cls}`}>{scanPill(s).label}</span>
                    {s.priceProvided !== false && s.valuation?.profit !== null && s.valuation?.profit !== undefined && (
                      <span className={`recent-profit ${s.valuation.profit >= 0 ? 'pos' : 'neg'}`}>{s.valuation.profit >= 0 ? '+' : '−'}{money(Math.abs(s.valuation.profit))}</span>
                    )}
                  </span>
                  <IconChevron size={18} className="muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
