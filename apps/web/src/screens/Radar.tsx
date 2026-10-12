import { useEffect, useRef, useState } from 'react';
import { marketFor } from '@fliplens/core';
import { api, type RadarItem, type ValuationResponse } from '../api.js';
import { errorText, money, tr } from '../i18n.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';

/**
 * Live radar: the camera stays open, a small frame goes to recognition every few seconds while the view changes,
 * and products get a box with their name. Boxes follow the camera between frames with a tiny on-device motion
 * tracker (block matching on a grey thumbnail). No price is ever guessed: tapping a box runs a normal check
 * (one check, real eBay listings) and only then the box shows the most worth paying.
 */

const T = tr({
  en: {
    dialog: 'Live radar',
    close: 'Close',
    starting: 'Starting camera…',
    hint: 'Move the phone slowly over the table. Tap an item to check its price (1 check).',
    looking: 'Looking…',
    moving: 'Hold still a moment',
    found: (n: number) => (n === 0 ? 'No items yet' : n === 1 ? '1 item' : `${n} items`),
    paused: 'Paused. Tap to continue.',
    pause: 'Pause',
    resume: 'Continue',
    checking: 'Checking…',
    upTo: (m: string) => `≤ ${m}`,
    noDeal: 'no deal',
    noData: 'too little data',
    checked: 'Checked',
    details: 'Details',
    sells: (m: string) => `sells for ~${m}`,
    tapToCheck: 'tap to check',
    noCamera: 'Camera not available here (needs HTTPS on a phone).',
    denied: 'Camera permission denied. Allow the camera for fliplens.eu in your browser settings.',
    failed: 'Could not start the camera.',
    signIn: 'Sign in with Google to use the live radar. You get 10 free checks every month.',
    limit: 'Live radar limit for today reached. Take a photo of the table instead.',
    budget: 'Photo recognition is paused for this month. Barcode and typing still work.',
    quota: 'No checks left this month.',
    upgrade: 'Get more checks',
  },
  de: {
    dialog: 'Live-Radar',
    close: 'Schließen',
    starting: 'Kamera startet…',
    hint: 'Fahr langsam mit dem Handy über den Tisch. Tipp auf einen Artikel, um den Preis zu prüfen (1 Check).',
    looking: 'Suche…',
    moving: 'Kurz still halten',
    found: (n: number) => (n === 0 ? 'Noch keine Artikel' : n === 1 ? '1 Artikel' : `${n} Artikel`),
    paused: 'Pausiert. Tippen zum Fortsetzen.',
    pause: 'Pause',
    resume: 'Weiter',
    checking: 'Prüfe…',
    upTo: (m: string) => `≤ ${m}`,
    noDeal: 'kein Deal',
    noData: 'zu wenig Daten',
    checked: 'Geprüft',
    details: 'Details',
    sells: (m: string) => `verkauft für ca. ${m}`,
    tapToCheck: 'tippen zum Prüfen',
    noCamera: 'Kamera hier nicht verfügbar (auf dem Handy braucht es HTTPS).',
    denied: 'Kamerazugriff verweigert. Erlaube die Kamera für fliplens.eu in den Browser-Einstellungen.',
    failed: 'Kamera konnte nicht gestartet werden.',
    signIn: 'Melde dich mit Google an, um das Live-Radar zu nutzen. Du bekommst jeden Monat 10 kostenlose Checks.',
    limit: 'Live-Radar-Limit für heute erreicht. Mach stattdessen ein Foto vom Tisch.',
    budget: 'Die Foto-Erkennung ist für diesen Monat pausiert. Barcode und Eintippen funktionieren weiter.',
    quota: 'Keine Checks mehr in diesem Monat.',
    upgrade: 'Mehr Checks holen',
  },
  it: {
    dialog: 'Radar live',
    close: 'Chiudi',
    starting: 'Avvio fotocamera…',
    hint: 'Muovi lentamente il telefono sopra il tavolo. Tocca un articolo per controllarne il prezzo (1 controllo).',
    looking: 'Cerco…',
    moving: 'Tieni fermo un attimo',
    found: (n: number) => (n === 0 ? 'Ancora nessun articolo' : n === 1 ? '1 articolo' : `${n} articoli`),
    paused: 'In pausa. Tocca per continuare.',
    pause: 'Pausa',
    resume: 'Continua',
    checking: 'Controllo…',
    upTo: (m: string) => `≤ ${m}`,
    noDeal: 'non conviene',
    noData: 'dati insufficienti',
    checked: 'Controllato',
    details: 'Dettagli',
    sells: (m: string) => `si vende a ~${m}`,
    tapToCheck: 'tocca per controllare',
    noCamera: 'Fotocamera non disponibile qui (sul telefono serve HTTPS).',
    denied: 'Accesso alla fotocamera negato. Consenti la fotocamera per fliplens.eu nelle impostazioni del browser.',
    failed: 'Impossibile avviare la fotocamera.',
    signIn: 'Accedi con Google per usare il Radar live. Ricevi 10 controlli gratuiti ogni mese.',
    limit: 'Limite giornaliero del Radar live raggiunto. Scatta invece una foto del tavolo.',
    budget: 'Il riconoscimento delle foto è in pausa per questo mese. Codice a barre e inserimento manuale funzionano ancora.',
    quota: 'Nessun controllo rimasto questo mese.',
    upgrade: 'Ottieni più controlli',
  },
  fr: {
    dialog: 'Radar en direct',
    close: 'Fermer',
    starting: 'Démarrage de la caméra…',
    hint: 'Passe lentement le téléphone au-dessus de la table. Touche un article pour vérifier son prix (1 vérification).',
    looking: 'Recherche…',
    moving: 'Ne bouge plus un instant',
    found: (n: number) => (n === 0 ? 'Aucun article pour l’instant' : n === 1 ? '1 article' : `${n} articles`),
    paused: 'En pause. Touche pour continuer.',
    pause: 'Pause',
    resume: 'Continuer',
    checking: 'Vérification…',
    upTo: (m: string) => `≤ ${m}`,
    noDeal: 'pas rentable',
    noData: 'trop peu de données',
    checked: 'Vérifié',
    details: 'Détails',
    sells: (m: string) => `se vend ~${m}`,
    tapToCheck: 'touche pour vérifier',
    noCamera: 'Caméra non disponible ici (HTTPS requis sur téléphone).',
    denied: 'Accès à la caméra refusé. Autorise la caméra pour fliplens.eu dans les réglages de ton navigateur.',
    failed: 'Impossible de démarrer la caméra.',
    signIn: 'Connecte-toi avec Google pour utiliser le Radar en direct. Tu reçois 10 vérifications gratuites chaque mois.',
    limit: 'Limite du Radar en direct atteinte pour aujourd’hui. Prends plutôt une photo de la table.',
    budget: 'La reconnaissance photo est en pause pour ce mois-ci. Le code-barres et la saisie fonctionnent toujours.',
    quota: 'Plus de vérifications ce mois-ci.',
    upgrade: 'Obtenir plus de vérifications',
  },
});

/** Start a new frame at most this often, and only when the view changed. */
const FRAME_EVERY_MS = 2500;
/** Pause after this long without a touch: an open camera must not run up AI costs in a pocket. */
const IDLE_PAUSE_MS = 75_000;
const SEND_MAX_SIDE = 768;
const THUMB_W = 80;
const SEARCH = 6;

type Price =
  | { state: 'loading' }
  | { state: 'ok'; maxBuyMinor: number; expectedMinor: number; scanId?: string | undefined }
  | { state: 'insufficient'; scanId?: string | undefined }
  | { state: 'error'; text: string };

interface Tracked {
  item: RadarItem;
  key: string;
  /** Accumulated camera shift when the frame was taken; boxes move by (now - this). */
  ox: number;
  oy: number;
}

const keyOf = (i: RadarItem) => `${i.brand}|${i.model}|${i.capacity ?? ''}`.toLowerCase();

/** Grey thumbnail of the current video frame. */
function thumb(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, w: number, h: number): Uint8Array {
  ctx.drawImage(video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (d[i]! * 77 + d[i + 1]! * 150 + d[i + 2]! * 29) >> 8;
  return g;
}

/** Content shift (pixels) from `prev` to `cur`: cur(p) ~ prev(p - d). Block matching over the centre. */
function shift(prev: Uint8Array, cur: Uint8Array, w: number, h: number): { dx: number; dy: number; err: number } {
  let best = { dx: 0, dy: 0, err: Infinity };
  const m = SEARCH + 2;
  for (let dy = -SEARCH; dy <= SEARCH; dy++) {
    for (let dx = -SEARCH; dx <= SEARCH; dx++) {
      let sum = 0;
      for (let y = m; y < h - m; y += 2) {
        const row = y * w;
        const prow = (y - dy) * w - dx;
        for (let x = m; x < w - m; x += 2) sum += Math.abs(cur[row + x]! - prev[prow + x]!);
        if (sum >= best.err) break;
      }
      if (sum < best.err) best = { dx, dy, err: sum };
    }
  }
  const samples = Math.ceil((h - 2 * m) / 2) * Math.ceil((w - 2 * m) / 2);
  return { ...best, err: best.err / samples };
}

interface Props {
  settings: Settings;
  onClose: () => void;
  onOpenScan: (scanId: string) => void;
  onUpgrade: () => void;
  onSignIn: () => void;
}

export function Radar({ settings, onClose, onOpenScan, onUpgrade, onSignIn }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<{ text: string; code?: string | undefined } | null>(null);
  const [tracked, setTracked] = useState<Tracked[]>([]);
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [, setTick] = useState(0);

  // Mutable tracker state, read by the animation loop.
  const acc = useRef({ x: 0, y: 0 });
  const lastTouch = useRef(Date.now());
  const pausedRef = useRef(false);
  const stopRef = useRef<string | null>(null);
  pausedRef.current = paused;

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let raf = 0;
    let inFlight: AbortController | undefined;
    const tc = document.createElement('canvas');
    const tctx = tc.getContext('2d', { willReadFrequently: true })!;
    const sc = document.createElement('canvas');
    let tw = THUMB_W;
    let th = 60;
    let prev: Uint8Array | null = null;
    let sentThumb: Uint8Array | null = null;
    const sentAt = { x: 0, y: 0, t: 0 };
    let recent: number[] = [];
    let lastStep = 0;
    let lastPaint = 0;

    const fail = (text: string, code?: string) => {
      stopRef.current = code ?? 'error';
      setError({ text, code });
    };

    async function send(video: HTMLVideoElement, now: number) {
      const s = Math.min(1, SEND_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
      sc.width = Math.round(video.videoWidth * s);
      sc.height = Math.round(video.videoHeight * s);
      sc.getContext('2d')!.drawImage(video, 0, 0, sc.width, sc.height);
      const image = sc.toDataURL('image/jpeg', 0.72);
      const at = { x: acc.current.x, y: acc.current.y };
      sentAt.x = at.x;
      sentAt.y = at.y;
      sentAt.t = now;
      sentThumb = prev;
      inFlight = new AbortController();
      setBusy(true);
      try {
        const r = await api.radarFrame(image, inFlight.signal);
        if (stopped) return;
        setTracked(r.items.map((item) => ({ item, key: keyOf(item), ox: at.x, oy: at.y })));
        track('radar_frame', { items: r.items.length });
      } catch (e) {
        if (stopped) return;
        const code = (e as { code?: string }).code;
        if (code === 'members_only') fail(T.signIn, code);
        else if (code === 'radar_limit') fail(T.limit, code);
        else if (code === 'ai_budget') fail(T.budget, code);
        // too_fast, network blips, model hiccups: the next frame tries again.
      } finally {
        inFlight = undefined;
        if (!stopped) setBusy(false);
      }
    }

    function step(now: number) {
      if (stopped) return;
      raf = requestAnimationFrame(step);
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      if (now - lastStep < 66) return; // ~15 fps is plenty for tracking
      lastStep = now;
      if (tc.width !== tw) {
        th = Math.max(24, Math.round((THUMB_W * video.videoHeight) / video.videoWidth));
        tc.width = tw;
        tc.height = th;
      }
      const cur = thumb(video, tctx, tw, th);
      if (prev) {
        const d = shift(prev, cur, tw, th);
        acc.current.x += d.dx / tw;
        acc.current.y += d.dy / th;
        recent = [...recent.slice(-5), Math.abs(d.dx) + Math.abs(d.dy)];
      }
      prev = cur;
      const isMoving = recent.reduce((a, b) => a + b, 0) > 4;
      setMoving(isMoving);
      if (now - lastPaint > 66) {
        lastPaint = now;
        setTick((t) => t + 1);
      }

      if (Date.now() - lastTouch.current > IDLE_PAUSE_MS && !pausedRef.current) setPaused(true);
      if (pausedRef.current || stopRef.current || inFlight || isMoving || document.hidden) return;
      if (now - sentAt.t < FRAME_EVERY_MS) return;
      // Same view as the last frame (nothing moved, nothing changed): no new call.
      if (sentThumb && sentAt.t > 0) {
        const moved = Math.abs(acc.current.x - sentAt.x) + Math.abs(acc.current.y - sentAt.y);
        if (moved < 0.04 && shift(sentThumb, cur, tw, th).err < 9) return;
      }
      void send(video, now);
    }

    (async () => {
      const video = videoRef.current;
      if (!video) return;
      if (!navigator.mediaDevices?.getUserMedia) return fail(T.noCamera);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        setReady(true);
        track('radar_started', {});
        raf = requestAnimationFrame(step);
      } catch (e) {
        fail(e instanceof Error && e.name === 'NotAllowedError' ? T.denied : T.failed);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      inFlight?.abort();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function touched() {
    lastTouch.current = Date.now();
    if (paused) setPaused(false);
  }

  async function check(t: Tracked) {
    touched();
    const p = prices[t.key];
    if (p && p.state !== 'error') return;
    setPrices((m) => ({ ...m, [t.key]: { state: 'loading' } }));
    const i = t.item;
    try {
      const r: ValuationResponse = await api.valuation({
        product: { category: i.category, brand: i.brand, model: i.model, ...(i.capacity && { capacity: i.capacity }) },
        condition: 'good',
        currency: marketFor(settings.country, settings.preset).currency,
        country: settings.country,
        preset: settings.preset,
        shippingCost: settings.shippingCost,
        targetRoiPct: settings.targetRoiPct,
        inputMethod: 'photo',
        identificationConfidence: i.confidence,
        recognitionModelVersion: 'radar-v1',
      });
      const res = r.result;
      const price: Price =
        res.status === 'ok'
          ? { state: 'ok', maxBuyMinor: res.maxBuyPrice?.amountMinor ?? 0, expectedMinor: res.estimate.expected.amountMinor, scanId: r.scanId }
          : { state: 'insufficient', scanId: r.scanId };
      setPrices((m) => ({ ...m, [t.key]: price }));
      track('radar_check', { result: price.state });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setPrices((m) => ({ ...m, [t.key]: { state: 'error', text: code === 'quota_exceeded' ? T.quota : errorText(e) } }));
      if (code === 'quota_exceeded') setError({ text: T.quota, code });
    }
  }

  // Video frame -> screen: the video is drawn with object-fit: cover.
  const video = videoRef.current;
  const view = viewRef.current;
  let place: ((b: RadarItem['box'], t: Tracked) => { left: number; top: number; width: number; height: number }) | null = null;
  if (video?.videoWidth && view) {
    const cw = view.clientWidth;
    const ch = view.clientHeight;
    const s = Math.max(cw / video.videoWidth, ch / video.videoHeight);
    const dw = video.videoWidth * s;
    const dh = video.videoHeight * s;
    const offX = (cw - dw) / 2;
    const offY = (ch - dh) / 2;
    place = (b, t) => ({
      left: offX + (b.x + acc.current.x - t.ox) * dw,
      top: offY + (b.y + acc.current.y - t.oy) * dh,
      width: b.w * dw,
      height: b.h * dh,
    });
  }

  const checked = Object.entries(prices).filter(([, p]) => p.state === 'ok' || p.state === 'insufficient');
  const labelOf = (key: string, item: RadarItem): { text: string; tone: string } => {
    const p = prices[key];
    if (!p) return { text: item.label, tone: 'new' };
    if (p.state === 'loading') return { text: `${item.label} · ${T.checking}`, tone: 'loading' };
    if (p.state === 'error') return { text: item.label, tone: 'new' };
    if (p.state === 'insufficient') return { text: `${item.label} · ${T.noData}`, tone: 'grey' };
    return p.maxBuyMinor > 0 ? { text: `${item.label} · ${T.upTo(money(p.maxBuyMinor, 0))}`, tone: 'good' } : { text: `${item.label} · ${T.noDeal}`, tone: 'grey' };
  };
  const names = new Map(tracked.map((t) => [t.key, t.item.label]));

  return (
    <div className="scanner radar" role="dialog" aria-label={T.dialog} onPointerDown={touched}>
      <div className="scanner-view" ref={viewRef}>
        <video ref={videoRef} playsInline muted />
        {place &&
          !paused &&
          tracked.map((t) => {
            const r = place!(t.item.box, t);
            const l = labelOf(t.key, t.item);
            return (
              <button
                type="button"
                key={t.key}
                className={`radar-box ${l.tone}${r.top < 64 ? ' inside' : ''}`}
                style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
                onClick={() => void check(t)}
              >
                {/* Keep the label on screen when the box runs off an edge. */}
                <span style={{ ...(r.left < 8 && { left: 8 - r.left }), ...(r.top < 64 && { top: 64 - r.top }) }}>{l.text}</span>
              </button>
            );
          })}
        <div className="radar-status">
          {!ready ? T.starting : busy ? T.looking : moving ? T.moving : T.found(tracked.length)}
          {busy && <span className="radar-dot" />}
        </div>
        <button type="button" className="scanner-close" onClick={onClose} aria-label={T.close}>×</button>
        {paused && (
          <button type="button" className="radar-paused" onClick={touched}>{T.paused}</button>
        )}
      </div>
      <div className="scanner-panel radar-panel">
        {error ? (
          <div className="banner warn">
            {error.text}{' '}
            {error.code === 'members_only' && <button type="button" className="link" onClick={onSignIn}>{T.signIn.split('.')[0]}</button>}
            {error.code === 'quota_exceeded' && <button type="button" className="link" onClick={onUpgrade}>{T.upgrade}</button>}
          </div>
        ) : checked.length === 0 ? (
          <p className="muted small">{T.hint}</p>
        ) : (
          <ul className="radar-list">
            {checked.slice(-3).reverse().map(([key, p]) => (
              <li key={key}>
                <span>
                  <strong>{names.get(key) ?? key.split('|').slice(0, 2).join(' ')}</strong>
                  <span className="muted small">
                    {p.state === 'ok' ? (p.maxBuyMinor > 0 ? `${T.upTo(money(p.maxBuyMinor))} · ${T.sells(money(p.expectedMinor))}` : T.noDeal) : T.noData}
                  </span>
                </span>
                {'scanId' in p && p.scanId && (
                  <button type="button" className="link" onClick={() => onOpenScan(p.scanId!)}>{T.details}</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="ghost wide" onClick={() => (paused ? touched() : setPaused(true))}>{paused ? T.resume : T.pause}</button>
      </div>
    </div>
  );
}
