// Renders the FlipLens icon (magnifier on teal) to PNG without external deps.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [15, 118, 110];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Coverage in a 512 design space, supersampled 4x4 for anti-aliasing. scale shrinks the glyph for maskable icons. */
function render(size, { rounded, glyphScale }) {
  const s = 512 / size;
  return png(size, (x, y) => {
    let bg = 0, fg = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const X = (x + (sx + 0.5) / 4) * s, Y = (y + (sy + 0.5) / 4) * s;
      const r = rounded ? 112 : 0;
      const cx = Math.min(Math.max(X, r), 512 - r), cy = Math.min(Math.max(Y, r), 512 - r);
      const inBg = Math.hypot(X - cx, Y - cy) <= r || !rounded;
      if (!inBg) continue;
      bg++;
      const gx = 256 + (X - 256) / glyphScale, gy = 256 + (Y - 256) / glyphScale;
      const ring = Math.abs(Math.hypot(gx - 236, gy - 236) - 118) <= 22;
      const handle = distToSegment(gx, gy, 322, 322, 414, 414) <= 26;
      if (ring || handle) fg++;
    }
    const a = bg / 16, f = bg ? fg / bg : 0;
    const c = TEAL.map((t, i) => Math.round(t + (WHITE[i] - t) * f));
    return [...c, Math.round(a * 255)];
  });
}
const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), render(192, { rounded: true, glyphScale: 1 }));
writeFileSync(new URL('icon-512.png', out), render(512, { rounded: true, glyphScale: 1 }));
writeFileSync(new URL('icon-maskable-512.png', out), render(512, { rounded: false, glyphScale: 0.72 }));
console.log('icons written');
