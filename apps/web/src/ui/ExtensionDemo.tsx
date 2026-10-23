import { money, tr } from '../i18n.js';

const T = tr({
  en: { check: 'STRONG BUY', resells: 'Resells for', profit: 'Profit', max: 'Max to pay', on: 'on Vinted · 37 eBay listings' },
  de: { check: 'KLARER KAUF', resells: 'Verkaufbar für', profit: 'Gewinn', max: 'Maximal zahlen', on: 'auf Vinted · 37 eBay-Angebote' },
  it: { check: 'OTTIMO AFFARE', resells: 'Si rivende a', profit: 'Profitto', max: 'Massimo da pagare', on: 'su Vinted · 37 annunci eBay' },
  fr: { check: 'EXCELLENTE AFFAIRE', resells: 'Se revend', profit: 'Bénéfice', max: 'Prix max', on: 'sur Vinted · 37 annonces eBay' },
});

const eur = (minor: number): string => money(minor, minor % 100 ? 2 : 0, 'EUR');

/** Landing illustration: a listing in a browser window with the extension's panel on top (static, no data). */
export function ExtensionDemo() {
  return (
    <div className="xd" aria-hidden="true">
      <div className="xd-bar">
        <span className="xd-dots"><i /><i /><i /></span>
        <span className="xd-url">vinted.de/items/…-nike-air-force-1</span>
      </div>
      <div className="xd-page">
        <div className="xd-photo" />
        <div className="xd-info">
          <b>Nike Air Force 1</b>
          <span>{eur(2695)}</span>
          <i /><i /><i />
        </div>
        <div className="xd-panel">
          <div className="xd-head"><span>F</span>FlipLens</div>
          <div className="xd-name">Nike Air Force 1</div>
          <div className="xd-verdict">{T.check}</div>
          <div className="xd-muted">{T.on}</div>
          <dl>
            <dt>{T.resells}</dt><dd>{eur(5200)}</dd>
            <dt>{T.profit}</dt><dd className="xd-good">{eur(2505)} · 93%</dd>
            <dt>{T.max}</dt><dd>{eur(4000)}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
