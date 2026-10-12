import { api } from '../api.js';
import { DECISION_LABEL } from '../format.js';
import { LANG, money, tr } from '../i18n.js';
import { track } from '../track.js';

/** "Share this find": a 1080x1350 image drawn on a canvas in the browser, shared or downloaded with the user's invite link. */

export type DecisionKey = 'strong_buy' | 'buy' | 'borderline' | 'skip';

export interface ShareFind {
  product: string;
  boughtMinor: number;
  worthMinor: number;
  profitMinor: number;
  roiPct: number | null;
  decision: DecisionKey;
}

const T = tr({
  en: {
    bought: 'Bought for',
    worth: 'Worth about',
    profit: 'Profit',
    roi: 'ROI',
    footer: 'Checked with FlipLens',
    text: (product: string, bought: string, worth: string) => `${product}: bought for ${bought}, worth about ${worth}. I checked it with FlipLens before buying.`,
    saved: 'Image saved, link copied',
    savedOnly: 'Image saved',
  },
  de: {
    bought: 'Gekauft für',
    worth: 'Wert ca.',
    profit: 'Gewinn',
    roi: 'ROI',
    footer: 'Geprüft mit FlipLens',
    text: (product: string, bought: string, worth: string) => `${product}: gekauft für ${bought}, Wert ca. ${worth}. Vor dem Kauf mit FlipLens geprüft.`,
    saved: 'Bild gespeichert, Link kopiert',
    savedOnly: 'Bild gespeichert',
  },
});

const COLOR: Record<DecisionKey, string> = { strong_buy: '#16a34a', buy: '#4d9f24', borderline: '#d08a0b', skip: '#e0472f' };
const FONT = "-apple-system, 'Segoe UI', Roboto, Inter, sans-serif";

// ---------- invite link (cached per page load) ----------

let codePromise: Promise<string | null> | null = null;

function inviteCode(): Promise<string | null> {
  if (!codePromise) codePromise = api.referral().then((r) => r.code, () => null);
  return codePromise;
}

/** Warm the cache early (e.g. when the result shows) so the click does not wait. */
export function prefetchShareLink(): void {
  void inviteCode();
}

async function shareLink(): Promise<string> {
  const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), 1500));
  const code = await Promise.race([inviteCode(), timeout]);
  const base = LANG === 'de' ? 'fliplens.eu/de' : 'fliplens.eu';
  if (!code) return base;
  return LANG === 'de' ? `fliplens.eu/de?ref=${code}` : `fliplens.eu/?ref=${code}`;
}

// ---------- drawing ----------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1]!;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

function draw(find: ShareFind, link: string): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d9488');
  bg.addColorStop(1, '#0f766e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // decorative circle
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(W - 80, 120, 260, 0, Math.PI * 2);
  ctx.fill();

  // brand
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 80, 90, 84, 84, 22);
  ctx.fill();
  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(116, 126, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(131, 141);
  ctx.lineTo(146, 156);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 52px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('FlipLens', 190, 134);

  // card
  const cx = 80;
  const cy = 250;
  const cw = W - 160;
  const ch = 860;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cx, cy, cw, ch, 48);
  ctx.fill();

  const pad = 64;
  const inner = cw - pad * 2;
  let y = cy + pad;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0e1116';
  ctx.font = `800 64px ${FONT}`;
  for (const line of wrap(ctx, find.product, inner, 2)) {
    ctx.fillText(line, cx + pad, y);
    y += 76;
  }
  y += 28;

  // verdict pill
  const label = DECISION_LABEL[find.decision] ?? find.decision;
  ctx.font = `800 46px ${FONT}`;
  const pw = ctx.measureText(label).width + 72;
  ctx.fillStyle = COLOR[find.decision] ?? '#0d9488';
  roundRect(ctx, cx + pad, y, pw, 92, 46);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx + pad + 36, y + 47);
  ctx.textBaseline = 'top';
  y += 140;

  // bought / worth
  const col = (x: number, title: string, value: string, color: string) => {
    ctx.fillStyle = '#667085';
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(title, x, y);
    ctx.fillStyle = color;
    ctx.font = `800 88px ${FONT}`;
    ctx.fillText(value, x, y + 50);
  };
  const half = inner / 2;
  col(cx + pad, T.bought, money(find.boughtMinor), '#0e1116');
  col(cx + pad + half, T.worth, money(find.worthMinor), '#0f766e');
  y += 190;

  // profit / roi box
  ctx.fillStyle = '#f2f4f7';
  roundRect(ctx, cx + pad, y, inner, 170, 32);
  ctx.fill();
  const sign = find.profitMinor >= 0 ? '+' : '−';
  ctx.fillStyle = '#667085';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(T.profit, cx + pad + 40, y + 30);
  ctx.fillText(T.roi, cx + pad + half + 20, y + 30);
  ctx.fillStyle = find.profitMinor >= 0 ? '#16a34a' : '#e0472f';
  ctx.font = `800 72px ${FONT}`;
  ctx.fillText(`${sign}${money(Math.abs(find.profitMinor))}`, cx + pad + 40, y + 74);
  ctx.fillStyle = '#0e1116';
  ctx.fillText(find.roiPct === null ? 'n/a' : LANG === 'de' ? `${Math.round(find.roiPct)} %` : `${Math.round(find.roiPct)}%`, cx + pad + half + 20, y + 74);

  // footer
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(T.footer, 80, H - 140);
  ctx.font = `500 40px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  let linkText = link;
  while (linkText.length > 4 && ctx.measureText(linkText).width > W - 160) linkText = linkText.slice(0, -1);
  ctx.fillText(linkText, 80, H - 80);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image could not be created'))), 'image/png'));
}

/**
 * Builds the image and shares it (native share sheet with the file) or, where files cannot be shared, downloads it
 * and copies the text with the link. Returns a short note to show, or null when the share sheet handled it.
 */
export async function shareFind(find: ShareFind): Promise<string | null> {
  const link = await shareLink();
  const url = `https://${link}`;
  const text = T.text(find.product, money(find.boughtMinor), money(find.worthMinor));
  const blob = await toBlob(draw(find, link));
  const file = new File([blob], 'fliplens-find.png', { type: 'image/png' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${url}` });
      track('find_shared', { method: 'share' });
      return null;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return null;
      // fall through to download
    }
  }

  const a = document.createElement('a');
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = 'fliplens-find.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  track('find_shared', { method: 'download' });
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return T.saved;
  } catch {
    return T.savedOnly;
  }
}
