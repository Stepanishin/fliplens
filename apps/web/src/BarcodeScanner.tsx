import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { tr } from './i18n.js';

const T = tr({
  en: {
    noCamera: 'Camera not available here (needs HTTPS on a phone). Type the barcode number below.',
    denied: 'Camera permission denied. Type the barcode number below.',
    failed: 'Could not start the camera. Type the barcode number below.',
    dialog: 'Scan barcode',
    close: 'Close',
    point: 'Point the camera at the barcode (EAN/UPC)',
    starting: ', starting camera…',
    placeholder: 'or type the number, e.g. 4548736112100',
    lookUp: 'Look up',
  },
  de: {
    noCamera: 'Kamera hier nicht verfügbar (auf dem Handy braucht es HTTPS). Gib die Barcode-Nummer unten ein.',
    denied: 'Kamerazugriff verweigert. Gib die Barcode-Nummer unten ein.',
    failed: 'Kamera konnte nicht gestartet werden. Gib die Barcode-Nummer unten ein.',
    dialog: 'Barcode scannen',
    close: 'Schließen',
    point: 'Halte die Kamera auf den Barcode (EAN/UPC)',
    starting: ', Kamera startet…',
    placeholder: 'oder Nummer eingeben, z. B. 4548736112100',
    lookUp: 'Suchen',
  },
  it: {
    noCamera: 'Fotocamera non disponibile qui (sul telefono serve HTTPS). Inserisci il numero del codice a barre qui sotto.',
    denied: 'Accesso alla fotocamera negato. Inserisci il numero del codice a barre qui sotto.',
    failed: 'Impossibile avviare la fotocamera. Inserisci il numero del codice a barre qui sotto.',
    dialog: 'Scansiona codice a barre',
    close: 'Chiudi',
    point: 'Inquadra il codice a barre (EAN/UPC)',
    starting: ', avvio fotocamera…',
    placeholder: 'oppure inserisci il numero, es. 4548736112100',
    lookUp: 'Cerca',
  },
  fr: {
    noCamera: 'Caméra non disponible ici (HTTPS requis sur téléphone). Saisis le numéro du code-barres ci-dessous.',
    denied: 'Accès à la caméra refusé. Saisis le numéro du code-barres ci-dessous.',
    failed: 'Impossible de démarrer la caméra. Saisis le numéro du code-barres ci-dessous.',
    dialog: 'Scanner le code-barres',
    close: 'Fermer',
    point: 'Vise le code-barres avec la caméra (EAN/UPC)',
    starting: ', démarrage de la caméra…',
    placeholder: 'ou saisis le numéro, ex. 4548736112100',
    lookUp: 'Rechercher',
  },
});

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
        setError(T.noCamera);
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
        setError(e instanceof Error && e.name === 'NotAllowedError' ? T.denied : T.failed);
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
    <div className="scanner" role="dialog" aria-label={T.dialog}>
      <div className="scanner-view">
        <video ref={videoRef} playsInline muted />
        <div className="scanner-frame" aria-hidden="true" />
        <button type="button" className="scanner-close" onClick={onClose} aria-label={T.close}>×</button>
      </div>
      <div className="scanner-panel">
        {error ? <div className="banner warn">{error}</div> : <p className="muted small">{T.point}{engine ? '' : T.starting}</p>}
        <form className="scanner-manual" onSubmit={submitManual}>
          <input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={T.placeholder} />
          <button type="submit" className="ghost" disabled={manual.replace(/\D/g, '').length < 8}>{T.lookUp}</button>
        </form>
      </div>
    </div>
  );
}
