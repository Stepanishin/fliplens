import { tr } from '../i18n.js';
import { ShelfDemo } from '../ui/ShelfDemo.js';

/** Full-screen promo layout recorded into videos (/demo-video?ratio=9x16|4x5). Not linked anywhere, noindex. */
const T = tr({
  en: { title: 'One photo. Every deal on the table.', sub: 'Real eBay prices · max price to pay', cta: 'Try free at fliplens.eu' },
  de: { title: 'Ein Foto. Jeder Deal auf dem Tisch.', sub: 'Echte eBay-Preise · Höchstpreis sofort', cta: 'Kostenlos testen: fliplens.eu' },
});

export function DemoVideo() {
  const ratio = new URLSearchParams(window.location.search).get('ratio') === '4x5' ? '4x5' : '9x16';
  return (
    <div className={`dv dv-${ratio}`}>
      <div className="dv-head">
        <div className="dv-brand"><img src="/icons/icon.svg" alt="" width={44} height={44} /> FlipLens</div>
        <h1>{T.title}</h1>
        <p>{T.sub}</p>
      </div>
      <ShelfDemo big />
      <div className="dv-cta">{T.cta}</div>
    </div>
  );
}
