import { useRef, useState, type ChangeEvent } from 'react';
import type { ServerScan } from '../api.js';
import { ago, DECISION_LABEL } from '../format.js';
import { resizeToJpegDataUrl } from '../image.js';
import { IconBarcode, IconCamera, IconChevron, IconEdit, IconImage } from '../ui/icons.js';

interface Props {
  visionEnabled: boolean;
  recent: ServerScan[];
  onPhotos: (photos: string[]) => void;
  onBarcode: () => void;
  onManual: () => void;
  onOpenScan: (s: ServerScan) => void;
  onSeeHistory: () => void;
}

export function Home({ visionEnabled, recent, onPhotos, onBarcode, onManual, onOpenScan, onSeeHistory }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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
      <header className="home-head">
        <h1>Should I buy it?</h1>
        <p className="muted">Scan an item, enter the price, get a resale verdict in seconds.</p>
      </header>

      <button type="button" className="scan-cta" onClick={() => cameraRef.current?.click()} disabled={!visionEnabled}>
        <span className="scan-cta-icon"><IconCamera size={34} /></span>
        <span className="scan-cta-text">
          <strong>Scan item</strong>
          <span>Take a photo, we identify the model</span>
        </span>
      </button>

      <div className="quick-actions">
        <button type="button" className="tile" onClick={onBarcode} disabled={!visionEnabled}>
          <IconBarcode />
          <span>Barcode</span>
        </button>
        <button type="button" className="tile" onClick={() => galleryRef.current?.click()} disabled={!visionEnabled}>
          <IconImage />
          <span>From gallery</span>
        </button>
        <button type="button" className="tile" onClick={onManual}>
          <IconEdit />
          <span>Type model</span>
        </button>
      </div>
      {!visionEnabled && <p className="muted small center">Photo and barcode recognition are off on the server.</p>}
      {error && <div className="banner bad">{error}</div>}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />

      {recent.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Recent</h2>
            <button type="button" className="link" onClick={onSeeHistory}>All</button>
          </div>
          <ul className="list-card">
            {recent.slice(0, 3).map((s) => (
              <li key={s.id}>
                <button type="button" className="list-row" onClick={() => onOpenScan(s)}>
                  <span className="list-main">
                    <strong>{s.product.brand} {s.product.model}</strong>
                    <span className="muted small">€{s.purchasePrice.amountMinor / 100} · {ago(s.createdAt)}</span>
                  </span>
                  <span className={`pill d-${s.valuation?.decision ?? 'insufficient'}`}>
                    {s.valuation?.decision ? DECISION_LABEL[s.valuation.decision as keyof typeof DECISION_LABEL] : 'NO DATA'}
                  </span>
                  <IconChevron size={18} className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
