import { useEffect, useRef, useState } from 'react';
import { money, tr } from '../i18n.js';

/**
 * Animated demo of the table scan for the landing page (and the promo videos recorded from /demo-video).
 * An illustrated stall, not a photo: boxes appear one by one, the ranked list slides up, the best item opens.
 * Prices are illustrative and kept realistic (taken from real checks in October 2026).
 */

const T = tr({
  en: {
    finding: 'Finding the items…',
    checking: 'Checking eBay in 5 countries…',
    found: '4 items found',
    payAtMost: (m: string) => `Pay at most ${m}`,
    sells: (m: string) => `sells for ~${m}`,
    verdict: 'Buy',
    worth: (m: string) => `Worth it up to ${m}`,
    profit: 'Profit',
    sellsFor: 'Sells for',
    paid: (m: string) => `if you pay ${m}`,
  },
  de: {
    finding: 'Suche die Artikel…',
    checking: 'Prüfe eBay in 5 Ländern…',
    found: '4 Artikel gefunden',
    payAtMost: (m: string) => `Zahl höchstens ${m}`,
    sells: (m: string) => `verkauft für ca. ${m}`,
    verdict: 'Kaufen',
    worth: (m: string) => `Lohnt sich bis ${m}`,
    profit: 'Gewinn',
    sellsFor: 'Verkauft für',
    paid: (m: string) => `wenn du ${m} zahlst`,
  },
});

/** Boxes in the 360x270 scene, best first. */
const ITEMS = [
  { name: 'Nintendo Switch OLED', max: 11900, sells: 17200, box: { x: 18, y: 32, w: 150, h: 72 } },
  { name: 'Sony WH-1000XM4', max: 9600, sells: 14000, box: { x: 196, y: 32, w: 136, h: 92 } },
  { name: 'Canon EF 50mm f/1.8 STM', max: 8000, sells: 11800, box: { x: 30, y: 142, w: 92, h: 98 } },
  { name: 'DualSense Controller', max: 3100, sells: 5200, box: { x: 150, y: 160, w: 108, h: 74 } },
] as const;

const eur = (minor: number) => money(minor, 0, 'EUR');

// Timeline in ms: photo, flash, scanning, boxes, list, tap + verdict, hold.
const STEPS = [900, 350, 1500, 1500, 1700, 2600, 1200];

export function ShelfDemo({ big = false }: { big?: boolean }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [phase, setPhase] = useState(reduce ? 6 : 0);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Animate only while on screen.
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !visible) return;
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % STEPS.length), STEPS[phase]);
    return () => window.clearTimeout(t);
  }, [phase, visible, reduce]);

  const boxes = phase >= 3 ? (phase === 3 ? null : ITEMS.length) : 0;
  const best = ITEMS[0];

  return (
    <div ref={ref} className={`sd ${big ? 'sd-big' : ''} sd-p${phase}`} aria-hidden="true">
      <div className="sd-phone">
        <div className="sd-scene">
          <svg viewBox="0 0 360 270" className="sd-svg">
            <defs>
              <linearGradient id="sdWood" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#a47b55" />
                <stop offset="1" stopColor="#8a6443" />
              </linearGradient>
            </defs>
            <rect width="360" height="270" fill="url(#sdWood)" />
            {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1="0" x2="360" y1={i * 46 + 20} y2={i * 46 + 22} stroke="#7b5839" strokeWidth="2" opacity="0.5" />)}
            {/* cloth */}
            <path d="M8 120 L352 112 L356 262 L4 266 Z" fill="#e9e1d3" opacity="0.18" />
            {/* handheld console */}
            <rect x="28" y="38" width="130" height="56" rx="12" fill="#2b2f36" />
            <rect x="28" y="38" width="24" height="56" rx="10" fill="#e8463c" />
            <rect x="134" y="38" width="24" height="56" rx="10" fill="#2f8fe0" />
            <rect x="56" y="44" width="74" height="44" rx="4" fill="#0e1116" />
            <circle cx="40" cy="56" r="4" fill="#2b2f36" />
            <circle cx="146" cy="76" r="4" fill="#2b2f36" />
            {/* headphones */}
            <path d="M214 92 C214 40 316 40 316 92" fill="none" stroke="#23262c" strokeWidth="12" strokeLinecap="round" />
            <rect x="204" y="78" width="30" height="40" rx="12" fill="#2a2d33" />
            <rect x="296" y="78" width="30" height="40" rx="12" fill="#2a2d33" />
            {/* lens */}
            <rect x="44" y="152" width="64" height="80" rx="10" fill="#15171b" />
            <rect x="44" y="166" width="64" height="10" fill="#3a3e46" />
            <rect x="44" y="196" width="64" height="6" fill="#c9162b" opacity="0.8" />
            <ellipse cx="76" cy="152" rx="32" ry="8" fill="#2c3038" />
            {/* controller */}
            <path d="M164 186 C164 170 178 166 204 166 C230 166 244 170 244 186 L250 214 C252 226 240 230 232 220 L222 206 L186 206 L176 220 C168 230 156 226 158 214 Z" fill="#f2f3f5" />
            <rect x="188" y="172" width="32" height="14" rx="4" fill="#1b1d22" />
            <circle cx="184" cy="196" r="5" fill="#1b1d22" />
            <circle cx="224" cy="196" r="5" fill="#1b1d22" />
            {/* mug: clutter, skipped */}
            <rect x="286" y="168" width="42" height="50" rx="6" fill="#d9cdb8" />
            <path d="M328 180 C344 180 344 206 328 206" fill="none" stroke="#d9cdb8" strokeWidth="6" />
          </svg>
          {phase === 1 && <div className="sd-flash" />}
          {phase === 2 && <div className="sd-scanline" />}
          {ITEMS.map((it, i) => (
            <div
              key={it.name}
              className={`sd-box ${boxes === null ? `sd-in sd-d${i}` : boxes && i < boxes ? 'sd-on' : ''} ${phase === 5 && i === 0 ? 'sd-tap' : ''}`}
              style={{ left: `${(it.box.x / 360) * 100}%`, top: `${(it.box.y / 270) * 100}%`, width: `${(it.box.w / 360) * 100}%`, height: `${(it.box.h / 270) * 100}%` }}
            >
              <span>{i + 1} · ≤ {eur(it.max)}</span>
            </div>
          ))}
          {(phase === 2 || phase === 3) && <div className="sd-status">{phase === 2 ? T.finding : T.checking}</div>}
        </div>

        <div className={`sd-list ${phase >= 4 ? 'sd-list-on' : ''}`}>
          <strong className="sd-found">{T.found}</strong>
          {ITEMS.map((it, i) => (
            <div key={it.name} className={`sd-row ${phase === 5 && i === 0 ? 'sd-row-tap' : ''}`}>
              <span className="sd-num">{i + 1}</span>
              <span className="sd-row-main">
                <b>{it.name}</b>
                <small>
                  {T.payAtMost(eur(it.max))} · {T.sells(eur(it.sells))}
                </small>
              </span>
            </div>
          ))}
        </div>

        <div className={`sd-verdict hero d-buy ${phase >= 5 ? 'sd-verdict-on' : ''}`}>
          <div className="hero-title">{T.verdict}</div>
          <div className="hero-sub">{T.worth(eur(best.max))}</div>
          <div className="hero-numbers">
            <div><span>{T.profit}</span><strong>+{eur(best.sells - 6000 - 600)}</strong></div>
            <div><span>{T.sellsFor}</span><strong>{eur(best.sells)}</strong></div>
          </div>
          <small className="sd-paid">{T.paid(eur(6000))}</small>
        </div>
        {phase === 5 && <span className="sd-finger" />}
      </div>
    </div>
  );
}
