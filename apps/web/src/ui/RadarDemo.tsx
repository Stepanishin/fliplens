import { useEffect, useRef, useState } from 'react';
import { money, tr } from '../i18n.js';

/**
 * Animated demo of the live radar for the landing page: the camera pans over a stall, boxes with names follow the
 * items, a tap runs the check and only then a price appears. Illustrated, prices illustrative but realistic.
 */

const T = tr({
  en: {
    looking: 'Looking…',
    items: (n: number) => (n === 1 ? '1 item' : `${n} items`),
    hint: 'Tap an item to check its price',
    checking: 'Checking…',
    sells: (m: string) => `sells for ~${m}`,
    details: 'Details',
  },
  de: {
    looking: 'Suche…',
    items: (n: number) => (n === 1 ? '1 Artikel' : `${n} Artikel`),
    hint: 'Tipp auf einen Artikel für den Preis',
    checking: 'Prüfe…',
    sells: (m: string) => `verkauft für ca. ${m}`,
    details: 'Details',
  },
});

/** Scene is 600 x 360; the camera sees VIEW_W of it. */
const SCENE_W = 600;
const SCENE_H = 360;
const VIEW_W = 260;
const LOOP = 12;

const ITEMS = [
  { name: 'Nintendo Switch OLED', at: 1.3, box: { x: 26, y: 36, w: 168, h: 80 } },
  { name: 'Canon EF 50mm f/1.8', at: 1.5, box: { x: 54, y: 184, w: 84, h: 122 } },
  { name: 'Sony WH-1000XM4', at: 2.7, box: { x: 244, y: 26, w: 144, h: 128 } },
  { name: 'DualSense', at: 2.9, box: { x: 226, y: 214, w: 110, h: 82 } },
  { name: 'Sony a6000', at: 4.3, box: { x: 426, y: 58, w: 124, h: 92 } },
] as const;
const TAPPED = 4;
const MAX_MINOR = 19000;
const SELLS_MINOR = 28000;
const TAP_AT = 6;
const PRICE_AT = 7.6;

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
/** Camera position (scene x of the left edge) at time t. */
function pan(t: number): number {
  const seg = (a: number, b: number, from: number, to: number) => from + (to - from) * ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
  if (t < 3.2) return seg(0.3, 3.2, 0, 170);
  if (t < 5.2) return seg(3.4, 5.2, 170, SCENE_W - VIEW_W);
  if (t < 8.4) return SCENE_W - VIEW_W;
  return seg(8.6, 10, SCENE_W - VIEW_W, 290);
}

export function RadarDemo() {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [t, setT] = useState(reduce ? 10.5 : 0);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !visible) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setT((x) => (x + dt) % LOOP);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduce]);

  const x = pan(t);
  const shown = ITEMS.filter((i) => t >= i.at);
  const looking = (t > 0.5 && t < 1.3) || (t > 3.6 && t < 4.3);
  const priced = t >= PRICE_AT;
  const checking = t >= TAP_AT && !priced;
  const fade = t > LOOP - 0.6 ? (LOOP - t) / 0.6 : t < 0.3 ? t / 0.3 : 1;
  const eur = (m: number) => money(m, 0, 'EUR');

  return (
    <div ref={ref} className="rd" aria-hidden="true">
      <div className="sd-phone rd-phone">
        <div className="rd-view" style={{ opacity: fade }}>
          <div className="rd-layer" style={{ width: `${(SCENE_W / VIEW_W) * 100}%`, transform: `translateX(${(-x / SCENE_W) * 100}%)` }}>
            <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="rd-svg">
              <defs>
                <linearGradient id="rdWood" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#a47b55" />
                  <stop offset="1" stopColor="#87613f" />
                </linearGradient>
              </defs>
              <rect width={SCENE_W} height={SCENE_H} fill="url(#rdWood)" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1="0" x2={SCENE_W} y1={i * 54 + 18} y2={i * 54 + 21} stroke="#7b5839" strokeWidth="2" opacity="0.5" />)}
              <path d="M10 170 L590 160 L596 352 L4 356 Z" fill="#e9e1d3" opacity="0.16" />
              {/* handheld console */}
              <rect x="34" y="46" width="152" height="62" rx="13" fill="#2b2f36" />
              <rect x="34" y="46" width="28" height="62" rx="11" fill="#e8463c" />
              <rect x="158" y="46" width="28" height="62" rx="11" fill="#2f8fe0" />
              <rect x="66" y="53" width="88" height="48" rx="4" fill="#0e1116" />
              {/* lens */}
              <rect x="64" y="200" width="64" height="100" rx="10" fill="#15171b" />
              <rect x="64" y="216" width="64" height="11" fill="#3a3e46" />
              <rect x="64" y="252" width="64" height="7" fill="#c9162b" opacity="0.85" />
              <ellipse cx="96" cy="200" rx="32" ry="8" fill="#2c3038" />
              {/* headphones */}
              <path d="M262 112 C262 50 370 50 370 112" fill="none" stroke="#23262c" strokeWidth="13" strokeLinecap="round" />
              <rect x="250" y="96" width="32" height="48" rx="13" fill="#2a2d33" />
              <rect x="350" y="96" width="32" height="48" rx="13" fill="#2a2d33" />
              {/* controller */}
              <path d="M232 240 C232 224 248 220 280 220 C312 220 328 224 328 240 L334 270 C336 284 322 288 314 276 L302 262 L258 262 L246 276 C238 288 224 284 226 270 Z" fill="#f2f3f5" />
              <rect x="266" y="226" width="28" height="13" rx="4" fill="#1b1d22" />
              <circle cx="254" cy="250" r="5" fill="#1b1d22" />
              <circle cx="306" cy="250" r="5" fill="#1b1d22" />
              {/* mug: clutter, never boxed */}
              <rect x="470" y="232" width="46" height="56" rx="7" fill="#d9cdb8" />
              <path d="M516 246 C534 246 534 274 516 274" fill="none" stroke="#d9cdb8" strokeWidth="6" />
              {/* mirrorless camera */}
              <g transform="translate(-36 0)">
              <rect x="470" y="70" width="108" height="70" rx="9" fill="#202227" />
              <rect x="470" y="70" width="34" height="70" rx="9" fill="#2c2f36" />
              <circle cx="540" cy="106" r="27" fill="#111317" stroke="#3a3e46" strokeWidth="5" />
              <circle cx="540" cy="106" r="12" fill="#1f3a5a" />
              <rect x="482" y="62" width="22" height="10" rx="3" fill="#2c2f36" />
              </g>
            </svg>
            {shown.map((it, i) => {
              const idx = ITEMS.indexOf(it);
              const tone = idx === TAPPED ? (priced ? 'good' : checking ? 'loading' : '') : '';
              const label = idx === TAPPED && priced ? `${it.name} · ≤ ${eur(MAX_MINOR)}` : idx === TAPPED && checking ? `${it.name} · ${T.checking}` : it.name;
              return (
                <div
                  key={it.name}
                  className={`rd-box ${tone}`}
                  style={{ left: `${(it.box.x / SCENE_W) * 100}%`, top: `${(it.box.y / SCENE_H) * 100}%`, width: `${(it.box.w / SCENE_W) * 100}%`, height: `${(it.box.h / SCENE_H) * 100}%`, animationDelay: `${i * 0.02}s` }}
                >
                  <span>{label}</span>
                </div>
              );
            })}
            {t >= TAP_AT - 0.5 && t < TAP_AT + 0.6 && (
              <span className="rd-finger" style={{ left: `${((ITEMS[TAPPED].box.x + 60) / SCENE_W) * 100}%`, top: `${((ITEMS[TAPPED].box.y + 50) / SCENE_H) * 100}%` }} />
            )}
          </div>
          <div className="rd-status">
            {looking ? T.looking : T.items(shown.length)}
            {looking && <span className="radar-dot" />}
          </div>
          <span className="rd-close">×</span>
        </div>
        <div className="rd-sheet">
          {priced ? (
            <div className="rd-row">
              <span>
                <b>{ITEMS[TAPPED].name}</b>
                <small>≤ {eur(MAX_MINOR)} · {T.sells(eur(SELLS_MINOR))}</small>
              </span>
              <em>{T.details}</em>
            </div>
          ) : (
            <small className="rd-hint">{T.hint}</small>
          )}
        </div>
      </div>
    </div>
  );
}
