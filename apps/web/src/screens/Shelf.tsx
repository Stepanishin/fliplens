import { useEffect, useMemo, useState } from 'react';
import { api, type ShelfItemResult, type ShelfScanResponse } from '../api.js';
import { CATEGORY_NAME } from '../format.js';
import { errorText, money, tr } from '../i18n.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';

const T = tr({
  en: {
    title: 'Table scan',
    finding: 'Finding the items on the table…',
    checking: 'Checking prices on eBay in 5 countries…',
    almost: 'Almost done…',
    found: (n: number) => (n === 1 ? '1 item found' : `${n} items found`),
    nothing: 'No items we can look up were found. Try a closer photo with labels and model names visible.',
    payAtMost: (m: string) => `Pay at most ${m}`,
    sells: (m: string) => `sells for about ${m}`,
    noData: 'Not enough market data',
    notChecked: {
      quota: 'Not checked: no checks left this month',
      limit: 'Not checked: up to 6 items per photo',
      low_confidence: 'Not sure what this is',
      unavailable: 'eBay did not answer, try again',
    } as Record<string, string>,
    confidence: { high: 'high confidence', medium: 'medium confidence', low: 'low confidence' } as Record<string, string>,
    open: 'Details',
    checkAlone: 'Check on its own',
    used: (n: number, left: number) => `${n} check${n === 1 ? '' : 's'} used for this photo · ${left} left this month`,
    upgrade: 'Get more checks',
    signIn: 'Sign in with Google to scan whole tables. You get 10 free checks every month.',
    again: 'Scan another table',
    hint: 'Boxes are approximate. Tap an item in the list for the full check.',
  },
  de: {
    title: 'Tisch-Scan',
    finding: 'Suche die Artikel auf dem Tisch…',
    checking: 'Prüfe Preise auf eBay in 5 Ländern…',
    almost: 'Gleich fertig…',
    found: (n: number) => (n === 1 ? '1 Artikel gefunden' : `${n} Artikel gefunden`),
    nothing: 'Keine Artikel gefunden, die wir nachschlagen können. Versuch ein näheres Foto, auf dem Etiketten und Modellnamen zu sehen sind.',
    payAtMost: (m: string) => `Zahl höchstens ${m}`,
    sells: (m: string) => `verkauft für ca. ${m}`,
    noData: 'Nicht genug Marktdaten',
    notChecked: {
      quota: 'Nicht geprüft: keine Checks mehr in diesem Monat',
      limit: 'Nicht geprüft: bis zu 6 Artikel pro Foto',
      low_confidence: 'Nicht sicher, was das ist',
      unavailable: 'eBay hat nicht geantwortet, versuch es noch einmal',
    } as Record<string, string>,
    confidence: { high: 'hohe Sicherheit', medium: 'mittlere Sicherheit', low: 'geringe Sicherheit' } as Record<string, string>,
    open: 'Details',
    checkAlone: 'Einzeln prüfen',
    used: (n: number, left: number) => `${n} Check${n === 1 ? '' : 's'} für dieses Foto · noch ${left} in diesem Monat`,
    upgrade: 'Mehr Checks holen',
    signIn: 'Melde dich mit Google an, um ganze Tische zu scannen. Du bekommst jeden Monat 10 kostenlose Checks.',
    again: 'Weiteren Tisch scannen',
    hint: 'Die Rahmen sind ungefähr. Tipp auf einen Artikel in der Liste für den vollständigen Check.',
  },
});

const rank = (i: ShelfItemResult): number => (i.status === 'ok' ? 3_000_000 + i.maxBuyMinor : i.status === 'insufficient' ? 1 : 0);
const tone = (i: ShelfItemResult): 'good' | 'grey' | 'none' => (i.status === 'ok' && i.maxBuyMinor > 0 ? 'good' : i.status === 'not_checked' ? 'none' : 'grey');

interface Props {
  photo: string;
  settings: Settings;
  onOpenScan: (scanId: string) => void;
  onCheckItem: (item: ShelfItemResult) => void;
  onUpgrade: () => void;
  onSignIn: () => void;
  onAgain: () => void;
}

/** One photo of a stall: every product found, valued from real listings, best buys first. */
export function Shelf({ photo, settings, onOpenScan, onCheckItem, onUpgrade, onSignIn, onAgain }: Props) {
  const [res, setRes] = useState<ShelfScanResponse | null>(null);
  const [error, setError] = useState<{ text: string; code?: string | undefined } | null>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let live = true;
    const timers = [window.setTimeout(() => live && setPhase(1), 4000), window.setTimeout(() => live && setPhase(2), 12000)];
    track('shelf_scan_started', {});
    api
      .shelfScan({ image: photo, preset: settings.preset, shippingCost: settings.shippingCost, targetRoiPct: settings.targetRoiPct })
      .then(
        (r) => {
          if (!live) return;
          setRes(r);
          track('shelf_scan_done', { items: r.items.length, valued: r.valued });
        },
        (e: unknown) => live && setError({ text: errorText(e), code: (e as { code?: string }).code }),
      );
    return () => {
      live = false;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [photo, settings.preset, settings.shippingCost, settings.targetRoiPct]);

  // Number items in the photo by position in the ranked list.
  const ranked = useMemo(() => (res ? [...res.items].sort((a, b) => rank(b) - rank(a)) : []), [res]);
  const number = (i: ShelfItemResult) => ranked.indexOf(i) + 1;

  return (
    <div className="screen">
      <div className="shelf-photo">
        <img src={photo} alt="" />
        {res &&
          res.items.map((i, k) => (
            <div
              key={k}
              className={`shelf-box ${tone(i)}${i.box.x + i.box.w > 0.8 ? ' right' : ''}${i.box.y < 0.07 ? ' inside' : ''}`}
              style={{ left: `${i.box.x * 100}%`, top: `${i.box.y * 100}%`, width: `${i.box.w * 100}%`, height: `${i.box.h * 100}%` }}
            >
              <span>
                {number(i)}
                {i.status === 'ok' && i.maxBuyMinor > 0 ? ` · ≤ ${money(i.maxBuyMinor)}` : ''}
              </span>
            </div>
          ))}
        {!res && !error && (
          <div className="shelf-loading">
            <span className="spinner light" aria-hidden="true" />
            <span>{phase === 0 ? T.finding : phase === 1 ? T.checking : T.almost}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="banner bad">
          {error.code === 'members_only' ? T.signIn : error.text}{' '}
          {error.code === 'members_only' && <button type="button" className="link" onClick={onSignIn}>{T.signIn.split('.')[0]}</button>}
          {error.code === 'quota_exceeded' && <button type="button" className="link" onClick={onUpgrade}>{T.upgrade}</button>}
        </div>
      )}

      {res && (
        <>
          <h1 className="screen-title">{res.items.length ? T.found(res.items.length) : T.title}</h1>
          {res.items.length === 0 && <p className="muted">{T.nothing}</p>}
          {res.items.length > 0 && <p className="muted small">{T.hint}</p>}
          <ul className="shelf-list">
            {ranked.map((i) => (
              <li key={number(i)} className={`shelf-row ${tone(i)}`}>
                <span className="shelf-num">{number(i)}</span>
                <span className="shelf-main">
                  <strong>{i.label}</strong>
                  <span className="muted small">{CATEGORY_NAME[i.category] ?? i.category}</span>
                  {i.status === 'ok' && (
                    <span className="small">
                      <b>{T.payAtMost(money(i.maxBuyMinor))}</b> · {T.sells(money(i.expectedMinor))} · {T.confidence[i.confidence] ?? i.confidence}
                    </span>
                  )}
                  {i.status === 'insufficient' && <span className="muted small">{T.noData}</span>}
                  {i.status === 'not_checked' && <span className="muted small">{T.notChecked[i.reason] ?? i.reason}</span>}
                </span>
                {i.status !== 'not_checked' && i.scanId ? (
                  <button type="button" className="link" onClick={() => onOpenScan(i.scanId!)}>{T.open}</button>
                ) : i.status === 'not_checked' && i.reason === 'quota' ? (
                  <button type="button" className="link" onClick={onUpgrade}>{T.upgrade}</button>
                ) : (
                  <button type="button" className="link" onClick={() => onCheckItem(i)}>{T.checkAlone}</button>
                )}
              </li>
            ))}
          </ul>
          {res.quota && <p className="muted small">{T.used(res.valued, res.quota.remaining)}</p>}
          <button type="button" className="ghost wide" onClick={onAgain}>{T.again}</button>
        </>
      )}
    </div>
  );
}
