import { useEffect, useState } from 'react';
import { api, type WatchInfo } from '../api.js';
import { ago, money, tr } from '../i18n.js';
import { enablePush } from '../push.js';

/** Profile: the user's price alerts (ADR-031), with remove and a test notification. */

const T = tr({
  en: {
    title: 'Price alerts',
    empty: 'No alerts yet. After a check, set one under "Price alert" to hear about cheaper listings.',
    upTo: (p: string) => `at ${p} or less`,
    alerts: (n: number) => (n === 1 ? '1 alert sent' : `${n} alerts sent`),
    checked: (a: string) => `checked ${a}`,
    remove: 'Remove',
    test: 'Send a test notification',
    sent: 'Sent. If nothing shows up, check the notification settings for FlipLens.',
    none: 'This device is not set up for notifications yet.',
    of: (n: number, l: number) => `${n} of ${l}`,
  },
  de: {
    title: 'Preisalarme',
    empty: 'Noch keine Alarme. Nach einem Check kannst du unter „Preisalarm“ einen setzen und hörst von günstigeren Angeboten.',
    upTo: (p: string) => `für ${p} oder weniger`,
    alerts: (n: number) => (n === 1 ? '1 Meldung gesendet' : `${n} Meldungen gesendet`),
    checked: (a: string) => `geprüft ${a}`,
    remove: 'Entfernen',
    test: 'Testbenachrichtigung senden',
    sent: 'Gesendet. Wenn nichts erscheint, prüf die Benachrichtigungseinstellungen für FlipLens.',
    none: 'Dieses Gerät ist noch nicht für Benachrichtigungen eingerichtet.',
    of: (n: number, l: number) => `${n} von ${l}`,
  },
  it: {
    title: 'Avvisi di prezzo',
    empty: 'Nessun avviso. Dopo un controllo impostane uno in «Avviso di prezzo» per sapere degli annunci più economici.',
    upTo: (p: string) => `a ${p} o meno`,
    alerts: (n: number) => (n === 1 ? '1 avviso inviato' : `${n} avvisi inviati`),
    checked: (a: string) => `controllato ${a}`,
    remove: 'Rimuovi',
    test: 'Invia una notifica di prova',
    sent: 'Inviata. Se non appare nulla, controlla le impostazioni delle notifiche di FlipLens.',
    none: 'Questo dispositivo non è ancora configurato per le notifiche.',
    of: (n: number, l: number) => `${n} di ${l}`,
  },
  fr: {
    title: 'Alertes de prix',
    empty: 'Aucune alerte. Après une vérification, crée-en une dans « Alerte de prix » pour être prévenu des annonces moins chères.',
    upTo: (p: string) => `à ${p} ou moins`,
    alerts: (n: number) => (n === 1 ? '1 alerte envoyée' : `${n} alertes envoyées`),
    checked: (a: string) => `vérifié ${a}`,
    remove: 'Retirer',
    test: 'Envoyer une notification de test',
    sent: 'Envoyée. Si rien n’apparaît, vérifie les réglages de notification de FlipLens.',
    none: 'Cet appareil n’est pas encore configuré pour les notifications.',
    of: (n: number, l: number) => `${n} sur ${l}`,
  },
});

type Cur = 'EUR' | 'GBP';

export function AlertsList() {
  const [data, setData] = useState<{ limit: number; watches: WatchInfo[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api.alertsAvailable().then((a) => (a.available ? api.watches().then(setData) : undefined), () => undefined);
  }, []);
  if (!data) return null;

  async function remove(id: string) {
    await api.deleteWatch(id);
    setData((d) => d && { ...d, watches: d.watches.filter((w) => w.id !== id) });
  }

  async function test() {
    setMsg(null);
    const ok = await enablePush().catch(() => 'unsupported' as const);
    if (ok !== 'ok') return setMsg(T.none);
    const r = await api.pushTest();
    setMsg(r.sent > 0 ? T.sent : T.none);
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{T.title}</h2>
        <span className="muted small">{T.of(data.watches.length, data.limit)}</span>
      </div>
      {data.watches.length === 0 ? (
        <p className="muted small">{T.empty}</p>
      ) : (
        <ul className="list alert-list">
          {data.watches.map((w) => (
            <li key={w.id}>
              <span>
                <strong>{w.name}</strong>
                <span className="muted small">
                  {' '}{T.upTo(money(w.maxPriceMinor, 0, w.currency as Cur))} · {T.alerts(w.alerts)}{w.lastCheckedAt ? ` · ${T.checked(ago(w.lastCheckedAt))}` : ''}
                </span>
              </span>
              <button type="button" className="link" onClick={() => void remove(w.id)}>{T.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="ghost wide" onClick={() => void test()}>{T.test}</button>
      {msg && <p className="hint">{msg}</p>}
    </section>
  );
}
