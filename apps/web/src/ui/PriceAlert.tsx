import { useEffect, useState } from 'react';
import { api, type Deal } from '../api.js';
import { currencySymbol, errorText, money, tr } from '../i18n.js';
import { enablePush, isIos, pushSupported } from '../push.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';

/**
 * "Tell me when it's cheaper" (ADR-031): a price alert for the checked item. We search eBay every few hours and send a
 * notification when a new listing costs at most the chosen price, shipping included.
 */

const T = tr({
  en: {
    title: 'Price alert',
    lead: 'Get a notification when this is listed for at most:',
    set: 'Notify me',
    setting: 'Setting up…',
    done: (p: string) => `Alert set. We check eBay every few hours and notify you about new listings at ${p} or less.`,
    already: (n: number) => (n === 1 ? 'Already listed at that price now:' : `${n} listings at that price right now:`),
    denied: 'Notifications are blocked for FlipLens. Allow them in your browser or phone settings, then try again.',
    ios: 'On iPhone, alerts work in the app: tap Share, then "Add to Home Screen", open FlipLens from there and set the alert.',
    unsupported: 'This browser cannot show notifications. Try Chrome, Edge, Firefox or the installed app.',
    note: 'Price includes shipping. Manage your alerts in Profile.',
  },
  de: {
    title: 'Preisalarm',
    lead: 'Benachrichtige mich, wenn es für höchstens so viel angeboten wird:',
    set: 'Benachrichtigen',
    setting: 'Wird eingerichtet…',
    done: (p: string) => `Alarm gesetzt. Wir prüfen eBay alle paar Stunden und melden neue Angebote für ${p} oder weniger.`,
    already: (n: number) => (n === 1 ? 'Gerade schon zu diesem Preis zu haben:' : `${n} Angebote gerade zu diesem Preis:`),
    denied: 'Benachrichtigungen für FlipLens sind blockiert. Erlaube sie in den Browser- oder Handyeinstellungen und versuch es erneut.',
    ios: 'Auf dem iPhone funktionieren Alarme in der App: Teilen tippen, dann „Zum Home-Bildschirm“, FlipLens von dort öffnen und den Alarm setzen.',
    unsupported: 'Dieser Browser kann keine Benachrichtigungen zeigen. Versuch Chrome, Edge, Firefox oder die installierte App.',
    note: 'Preis inklusive Versand. Deine Alarme verwaltest du im Profil.',
  },
  it: {
    title: 'Avviso di prezzo',
    lead: 'Avvisami quando è in vendita al massimo a:',
    set: 'Avvisami',
    setting: 'Imposto…',
    done: (p: string) => `Avviso impostato. Controlliamo eBay ogni poche ore e ti avvisiamo dei nuovi annunci a ${p} o meno.`,
    already: (n: number) => (n === 1 ? 'Già in vendita a quel prezzo:' : `${n} annunci a quel prezzo adesso:`),
    denied: 'Le notifiche di FlipLens sono bloccate. Consentile nelle impostazioni del browser o del telefono e riprova.',
    ios: 'Su iPhone gli avvisi funzionano nell’app: tocca Condividi, poi «Aggiungi alla schermata Home», apri FlipLens da lì e imposta l’avviso.',
    unsupported: 'Questo browser non mostra notifiche. Prova Chrome, Edge, Firefox o l’app installata.',
    note: 'Prezzo spedizione inclusa. Gestisci gli avvisi nel Profilo.',
  },
  fr: {
    title: 'Alerte de prix',
    lead: 'Préviens-moi quand c’est en vente au maximum à :',
    set: 'Me prévenir',
    setting: 'Configuration…',
    done: (p: string) => `Alerte créée. On vérifie eBay toutes les quelques heures et on te prévient des nouvelles annonces à ${p} ou moins.`,
    already: (n: number) => (n === 1 ? 'Déjà en vente à ce prix :' : `${n} annonces à ce prix en ce moment :`),
    denied: 'Les notifications de FlipLens sont bloquées. Autorise-les dans les réglages du navigateur ou du téléphone, puis réessaie.',
    ios: 'Sur iPhone, les alertes marchent dans l’app : touche Partager, puis « Sur l’écran d’accueil », ouvre FlipLens depuis là et crée l’alerte.',
    unsupported: 'Ce navigateur ne peut pas afficher de notifications. Essaie Chrome, Edge, Firefox ou l’app installée.',
    note: 'Prix livraison comprise. Gère tes alertes dans le Profil.',
  },
});

type Cur = 'EUR' | 'GBP';
let available: Promise<boolean> | undefined;

export function PriceAlert({ scanId, suggestedMinor, currency, settings }: { scanId: string; suggestedMinor: number; currency: Cur; settings: Settings }) {
  const [on, setOn] = useState(false);
  const [price, setPrice] = useState(String(Math.max(1, Math.round(suggestedMinor / 100))));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [current, setCurrent] = useState<Deal[] | null>(null);

  useEffect(() => {
    available ??= api.alertsAvailable().then((r) => r.available, () => false);
    void available.then(setOn);
  }, []);
  if (!on) return null;

  async function create() {
    setBusy(true);
    setMsg(null);
    try {
      if (!pushSupported()) {
        setMsg(isIos() ? T.ios : T.unsupported);
        return;
      }
      const p = await enablePush();
      if (p === 'denied') {
        setMsg(T.denied);
        return;
      }
      if (p === 'unsupported') {
        setMsg(isIos() ? T.ios : T.unsupported);
        return;
      }
      const max = Number(price.replace(',', '.'));
      const r = await api.createWatch({ scanId, maxPrice: max, country: settings.country, preset: settings.preset });
      setCurrent(r.current);
      track('price_alert_created', { current: r.current.length });
    } catch (e) {
      setMsg(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const max = Math.round(Number(price.replace(',', '.')) * 100);
  return (
    <section className="card alert-card">
      <h2>{T.title}</h2>
      {current === null ? (
        <>
          <p className="muted small">{T.lead}</p>
          <div className="row2">
            <div className="price-input small">
              <span>{currencySymbol()}</span>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={T.lead} />
            </div>
            <button type="button" className="primary" disabled={busy || !(max > 0)} onClick={() => void create()}>{busy ? T.setting : T.set}</button>
          </div>
          {msg && <p className="hint warn">{msg}</p>}
          <p className="muted small">{T.note}</p>
        </>
      ) : (
        <>
          <p>{T.done(money(max, 0, currency))}</p>
          {current.length > 0 && (
            <>
              <p className="muted small">{T.already(current.length)}</p>
              <ul className="alert-deals">
                {current.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <strong>{money(d.priceMinor, 0, d.currency as Cur)}</strong> <span>{d.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
