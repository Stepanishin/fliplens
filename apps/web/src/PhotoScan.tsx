import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { IdentificationCandidate } from '@fliplens/recognition';
import { api, ApiError, type IdentificationResult } from './api.js';
import { CONDITION_LABEL } from './format.js';
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
  const [result, setResult] = useState<IdentificationResult | null>(null);
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
        <button type="button" className="ghost" onClick={() => uploadRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
          Upload photo
        </button>
      </div>
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

      {result && (
        <div className="candidates">
          {result.candidates.length === 0 ? (
            <div className="banner warn">No product recognised. Try another angle, the label with the model number, or enter it manually.</div>
          ) : (
            <>
              <p className="muted small">{result.candidates.length > 1 ? 'Is this:' : 'Detected:'}</p>
              {result.candidates.map((c, i) => (
                <button key={i} type="button" className={`candidate ${picked === i ? 'on' : ''}`} onClick={() => choose(i, result)}>
                  <span>
                    <strong>{c.brand} {c.model}</strong>
                    <span className="muted small">
                      {' '}
                      {[c.capacity, c.mount && `${c.mount} mount`, c.colour, c.category.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className={`conf ${c.confidence >= 0.85 ? 'c-high' : c.confidence >= 0.6 ? 'c-medium' : 'c-low'}`}>
                    {Math.round(c.confidence * 100)}%
                  </span>
                </button>
              ))}
            </>
          )}
          {result.conditionGuess && (
            <p className="muted small">
              Condition guess: {CONDITION_LABEL[result.conditionGuess]}
              {result.conditionNotes ? ` (${result.conditionNotes})` : ''}. Please confirm below.
            </p>
          )}
          {result.identifyingText.length > 0 && <p className="muted small">Read on item: {result.identifyingText.join(' · ')}</p>}
          <p className="muted small">
            {result.modelVersion} · {(result.latencyMs / 1000).toFixed(1)}s
            {result.costUsd !== undefined ? ` · ~$${result.costUsd.toFixed(4)}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
