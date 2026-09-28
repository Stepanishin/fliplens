import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { IScannerControls } from '@zxing/browser';

interface Props {
  onCode: (code: string) => void;
  onClose: () => void;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** Minimal typing for the native Barcode Detection API (Chrome/Android; not in Safari). */
interface NativeDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: { new (opts: { formats: string[] }): NativeDetector; getSupportedFormats(): Promise<string[]> };
  }
}

/** Live camera barcode scanner: native BarcodeDetector where available, ZXing (JS) everywhere else. Manual entry as fallback. */
export function BarcodeScanner({ onCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [engine, setEngine] = useState<'native' | 'zxing' | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let zxing: IScannerControls | undefined;
    let timer: number | undefined;
    const done = (code: string) => {
      if (stopped) return;
      stopped = true;
      navigator.vibrate?.(60);
      onCode(code);
    };

    (async () => {
      const video = videoRef.current;
      if (!video) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not available here (needs HTTPS on a phone). Type the barcode number below.');
        return;
      }
      const native = window.BarcodeDetector ? await window.BarcodeDetector.getSupportedFormats().catch(() => []) : [];
      try {
        if (window.BarcodeDetector && FORMATS.some((f) => native.includes(f))) {
          setEngine('native');
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          if (stopped) return;
          video.srcObject = stream;
          await video.play();
          const detector = new window.BarcodeDetector({ formats: FORMATS.filter((f) => native.includes(f)) });
          timer = window.setInterval(async () => {
            if (stopped || video.readyState < 2) return;
            const codes = await detector.detect(video).catch(() => []);
            const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue))?.rawValue;
            if (code) done(code);
          }, 200);
        } else {
          setEngine('zxing');
          const { BrowserMultiFormatOneDReader } = await import('@zxing/browser');
          if (stopped) return;
          zxing = await new BrowserMultiFormatOneDReader().decodeFromConstraints(
            { video: { facingMode: 'environment' }, audio: false },
            video,
            (result) => {
              const code = result?.getText();
              if (code && /^\d{8,14}$/.test(code)) done(code);
            },
          );
        }
      } catch (e) {
        setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Camera permission denied. Type the barcode number below.' : 'Could not start the camera. Type the barcode number below.');
      }
    })();

    return () => {
      stopped = true;
      if (timer) window.clearInterval(timer);
      zxing?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const code = manual.replace(/\D/g, '');
    if (code.length >= 8) onCode(code);
  }

  return (
    <div className="scanner" role="dialog" aria-label="Scan barcode">
      <div className="scanner-view">
        <video ref={videoRef} playsInline muted />
        <div className="scanner-frame" aria-hidden="true" />
        <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="scanner-panel">
        {error ? <div className="banner warn">{error}</div> : <p className="muted small">Point the camera at the barcode (EAN/UPC){engine ? '' : ', starting camera…'}</p>}
        <form className="scanner-manual" onSubmit={submitManual}>
          <input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="or type the number, e.g. 4548736112100" />
          <button type="submit" className="ghost" disabled={manual.replace(/\D/g, '').length < 8}>Look up</button>
        </form>
      </div>
    </div>
  );
}
