import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { IdentificationCandidate } from '@fliplens/recognition';
import { api, ApiError, type BarcodeResult, type IdentificationResult } from './api.js';
import { BarcodeScanner } from './BarcodeScanner.js';
import { Candidates } from './Candidates.js';
import { resizeToJpegDataUrl } from './image.js';

const MAX_PHOTOS = 3;

interface Props {
  enabled: boolean;
  onPick: (candidate: IdentificationCandidate, result: IdentificationResult) => void;
  /** Current resized JPEG data URLs (for saving to the benchmark). */
  onPhotosChange?: (photos: string[]) => void;
}

export function PhotoScan({ enabled, onPick, onPhotosChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(IdentificationResult & Partial<Pick<BarcodeResult, 'gtin' | 'listingCount'>>) | null>(null);
  const [scanning, setScanning] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => onPhotosChange?.(photos), [photos, onPhotosChange]);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    try {
      const urls = await Promise.all(files.map((f) => resizeToJpegDataUrl(f)));
      const next = [...photos, ...urls].slice(0, MAX_PHOTOS);
      setPhotos(next);
      setResult(null);
      setPicked(null);
      if (enabled) void identify(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read image');
    }
  }

  async function identify(images: string[]) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.identify(images);
      setResult(r);
      if (r.candidates.length === 1 && r.candidates[0]!.confidence >= 0.85) choose(0, r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Recognition failed');
    } finally {
      setBusy(false);
    }
  }

  const closeScanner = useCallback(() => setScanning(false), []);
  const onBarcode = useCallback(async (code: string) => {
    setScanning(false);
    setBusy(true);
    setError(null);
    setResult(null);
    setPicked(null);
    try {
      const r = await api.identifyBarcode(code);
      setResult(r);
      if (r.candidates.length === 1 && r.candidates[0]!.confidence >= 0.85) {
        setPicked(0);
        onPick(r.candidates[0]!, r);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Barcode lookup failed');
    } finally {
      setBusy(false);
    }
  }, [onPick]);

  function choose(i: number, r: IdentificationResult) {
    const c = r.candidates[i];
    if (!c) return;
    setPicked(i);
    onPick(c, r);
  }

  function remove(i: number) {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setResult(null);
    setPicked(null);
  }

  return (
    <div className="scan">
      <div className="scan-buttons">
        <button type="button" className="primary" onClick={() => cameraRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
          Scan item
        </button>
        <button type="button" className="ghost" onClick={() => setScanning(true)} disabled={!enabled}>
          Barcode
        </button>
      </div>
      <button type="button" className="link" onClick={() => uploadRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
        Upload photo from gallery
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
      <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />

      {!enabled && <p className="muted small">Photo recognition is off: set OPENAI_API_KEY in .env and restart the API.</p>}

      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((src, i) => (
            <div key={i} className="thumb">
              <img src={src} alt={`Photo ${i + 1}`} />
              <button type="button" aria-label="Remove photo" onClick={() => remove(i)}>×</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="thumb add" onClick={() => cameraRef.current?.click()} aria-label="Add another photo">+</button>
          )}
        </div>
      )}

      {photos.length > 0 && enabled && !busy && !result && (
        <button type="button" className="ghost" onClick={() => void identify(photos)}>Identify</button>
      )}
      {busy && <p className="muted">Identifying…</p>}
      {error && <div className="banner bad">{error}</div>}

      {scanning && <BarcodeScanner onCode={onBarcode} onClose={closeScanner} />}

      {result && (
        <Candidates
          result={result}
          picked={picked}
          onChoose={(i) => choose(i, result)}
          evidenceLabel={result.gtin ? 'Matching listings' : 'Read on item'}
          emptyText={result.gtin ? 'Barcode found, but the product is unclear. Try a photo or enter the model.' : 'No product recognised. Try another angle, the label with the model number, or enter it manually.'}
          {...(result.gtin && { extra: `EAN ${result.gtin} · ${result.listingCount} eBay listings` })}
        />
      )}
    </div>
  );
}
