import { useRef, useState, type ChangeEvent } from 'react';
import type { Account, BillingInfo, ServerScan } from '../api.js';
import { ago, scanPill } from '../format.js';
import { resizeToJpegDataUrl } from '../image.js';
import { IconBarcode, IconCamera, IconChevron, IconEdit, IconImage, IconSpark } from '../ui/icons.js';
import { eur } from '../ui/verdict.js';
import { InstallApp } from '../ui/InstallApp.js';

interface Props {
  account: Account | null;
  visionEnabled: boolean;
  recent: ServerScan[] | null;
  onPhotos: (photos: string[]) => void;
  /** The "listing from a photo" tool (any item, e.g. clothes for Vinted). */
  onQuickListing: () => void;
  onCamera: () => void;
  onBarcode: () => void;
  onManual: () => void;
  onOpenScan: (s: ServerScan) => void;
  onSeeHistory: () => void;
  quota: BillingInfo['quota'] | null;
  onOpenPlans: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home({ account, visionEnabled, recent, onPhotos, onQuickListing, onCamera, onBarcode, onManual, onOpenScan, onSeeHistory, quota, onOpenPlans }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const firstName = account?.name?.split(' ')[0];

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 3);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    try {
      onPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the photo');
    }
  }

  return (
    <div className="screen home">
      <p className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</p>

      <section className="hero-scan">
        <div className="hero-scan-text">
          <h1>Should I buy it?</h1>
          <p>Snap the item, enter the price. We check the European resale market for you.</p>
        </div>
        <button type="button" className="hero-scan-btn" onClick={onCamera} disabled={!visionEnabled}>
          <IconCamera size={24} />
          Scan item
        </button>
        <div className="hero-scan-alt">
          <button type="button" onClick={onBarcode} disabled={!visionEnabled}><IconBarcode size={18} /> Barcode</button>
          <button type="button" onClick={() => galleryRef.current?.click()} disabled={!visionEnabled}><IconImage size={18} /> Gallery</button>
          <button type="button" onClick={onManual}><IconEdit size={18} /> Type it</button>
        </div>
      </section>
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      {!visionEnabled && <p className="muted small center">Photo and barcode recognition are off on the server.</p>}
      {error && <div className="banner bad">{error}</div>}

      <button type="button" className="home-tool" onClick={onQuickListing} disabled={!visionEnabled}>
        <span className="home-tool-icon"><IconSpark size={20} /></span>
        <span style={{ flex: 1 }}>
          <strong>Selling something? Write the listing from a photo</strong>
          <span className="muted">Title and description for Vinted, eBay or Kleinanzeigen. Clothes too.</span>
        </span>
        <IconChevron size={18} className="muted" />
      </button>

      {quota && quota.plan === 'free' && (
        <button type="button" className="quota-card" onClick={onOpenPlans}>
          <span className="quota-text">
            <strong>{quota.remaining} free checks left</strong>
            <span className="muted small">this month · {quota.used}/{quota.limit} used</span>
          </span>
          <span className="quota-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%` }} /></span>
          <span className="link">Upgrade</span>
        </button>
      )}

      <InstallApp variant="banner" />

      <section className="section">
        <div className="section-head">
          <h2>Recent checks</h2>
          {recent && recent.length > 0 && <button type="button" className="link" onClick={onSeeHistory}>See all</button>}
        </div>
        {recent === null ? (
          <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div>
        ) : recent.length === 0 ? (
          <ol className="how">
            <li><span>1</span><div><strong>Scan</strong><p className="muted small">Photo, barcode or type the model.</p></div></li>
            <li><span>2</span><div><strong>Enter the price</strong><p className="muted small">What the seller asks for it.</p></div></li>
            <li><span>3</span><div><strong>Get the verdict</strong><p className="muted small">Resale value, profit, ROI, from real listings.</p></div></li>
          </ol>
        ) : (
          <ul className="recent">
            {recent.slice(0, 4).map((s) => (
              <li key={s.id}>
                <button type="button" className={`recent-row v-${s.priceProvided === false ? 'value' : (s.valuation?.decision ?? 'insufficient')}`} onClick={() => onOpenScan(s)}>
                  <span className="recent-main">
                    <strong>{s.product.brand} {s.product.model}{s.product.capacity ? ` ${s.product.capacity}` : ''}</strong>
                    <span className="muted small">
                      {s.priceProvided === false ? 'worth' : `€${s.purchasePrice.amountMinor / 100} →`} {s.valuation?.expected ? eur(s.valuation.expected) : 'n/a'} · {ago(s.createdAt)}
                    </span>
                  </span>
                  <span className="recent-side">
                    <span className={`pill ${scanPill(s).cls}`}>{scanPill(s).label}</span>
                    {s.priceProvided !== false && s.valuation?.profit !== null && s.valuation?.profit !== undefined && (
                      <span className={`recent-profit ${s.valuation.profit >= 0 ? 'pos' : 'neg'}`}>{s.valuation.profit >= 0 ? '+' : '−'}{eur(Math.abs(s.valuation.profit))}</span>
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
