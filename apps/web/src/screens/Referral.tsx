import { useEffect, useState } from 'react';
import { api, type ReferralInfo } from '../api.js';
import { date, errorText, LANG, money, tr } from '../i18n.js';
import { track } from '../track.js';

const T = tr({
  en: {
    title: 'Invite friends, earn money',
    lead: (pct: number, months: number) => `You get ${pct}% of everything the people you invite pay for FlipLens during their first ${months} months.`,
    yourLink: 'Your invite link',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share',
    shareText: 'I check what things resell for with FlipLens before I buy them. Try it free:',
    invited: 'Signed up',
    paying: 'Paying',
    available: 'Ready to withdraw',
    pending: 'On hold',
    pendingNote: (days: number) => `Becomes available ${days} days after each payment (refund period).`,
    requested: 'Payout requested',
    paid: 'Paid out',
    payoutTitle: 'Withdraw',
    minNote: (min: string) => `Payouts start at ${min}.`,
    paypal: 'PayPal',
    bank: 'Bank transfer',
    paypalEmail: 'PayPal email',
    holder: 'Account holder',
    iban: 'IBAN',
    request: (amount: string) => `Request payout of ${amount}`,
    sending: 'Sending…',
    requestedOk: (amount: string) => `Payout of ${amount} requested. We usually pay within 14 days.`,
    belowMin: (min: string) => `You need at least ${min} ready to withdraw.`,
    badDetails: 'Please check the payout details.',
    history: 'Earnings',
    empty: 'No earnings yet. Share your link with people who buy and resell.',
    payment: (amount: string) => `Payment ${amount}`,
    status: {
      pending: 'on hold',
      available: 'available',
      requested: 'requested',
      paid: 'paid out',
      reversed: 'reversed (refund)',
    } as Record<string, string>,
    payouts: 'Payouts',
    payoutStatus: { requested: 'in progress', paid: 'paid', rejected: 'rejected' } as Record<string, string>,
    rules: (pct: number, months: number, days: number, min: string) =>
      `${pct}% of payments without tax, for ${months} months from the invited person's first payment. Only new accounts count; inviting yourself does not. Earnings become available after ${days} days and are reversed if a payment is refunded. Payouts from ${min} by PayPal or bank transfer. You are responsible for any taxes on your earnings.`,
    terms: 'Terms',
    loading: 'Loading…',
  },
  de: {
    title: 'Freunde einladen, Geld verdienen',
    lead: (pct: number, months: number) => `Du bekommst ${pct} % von allem, was die Leute, die du einlädst, in ihren ersten ${months} Monaten für FlipLens bezahlen.`,
    yourLink: 'Dein Einladungslink',
    copy: 'Kopieren',
    copied: 'Kopiert',
    share: 'Teilen',
    shareText: 'Ich prüfe mit FlipLens, wofür sich Sachen weiterverkaufen lassen, bevor ich sie kaufe. Probier es kostenlos:',
    invited: 'Registriert',
    paying: 'Zahlend',
    available: 'Auszahlbar',
    pending: 'In Wartezeit',
    pendingNote: (days: number) => `Wird ${days} Tage nach jeder Zahlung auszahlbar (Widerrufsfrist).`,
    requested: 'Auszahlung angefragt',
    paid: 'Ausgezahlt',
    payoutTitle: 'Auszahlen',
    minNote: (min: string) => `Auszahlungen ab ${min}.`,
    paypal: 'PayPal',
    bank: 'Überweisung',
    paypalEmail: 'PayPal-E-Mail',
    holder: 'Kontoinhaber',
    iban: 'IBAN',
    request: (amount: string) => `${amount} auszahlen lassen`,
    sending: 'Wird gesendet…',
    requestedOk: (amount: string) => `Auszahlung von ${amount} angefragt. Wir zahlen in der Regel innerhalb von 14 Tagen aus.`,
    belowMin: (min: string) => `Du brauchst mindestens ${min} auszahlbares Guthaben.`,
    badDetails: 'Bitte prüf die Auszahlungsdaten.',
    history: 'Einnahmen',
    empty: 'Noch keine Einnahmen. Teil deinen Link mit Leuten, die kaufen und weiterverkaufen.',
    payment: (amount: string) => `Zahlung ${amount}`,
    status: {
      pending: 'in Wartezeit',
      available: 'auszahlbar',
      requested: 'angefragt',
      paid: 'ausgezahlt',
      reversed: 'storniert (Erstattung)',
    } as Record<string, string>,
    payouts: 'Auszahlungen',
    payoutStatus: { requested: 'in Bearbeitung', paid: 'ausgezahlt', rejected: 'abgelehnt' } as Record<string, string>,
    rules: (pct: number, months: number, days: number, min: string) =>
      `${pct} % der Zahlungen ohne Steuern, ${months} Monate ab der ersten Zahlung der eingeladenen Person. Es zählen nur neue Konten; dich selbst einzuladen zählt nicht. Einnahmen werden nach ${days} Tagen auszahlbar und bei einer Erstattung storniert. Auszahlung ab ${min} per PayPal oder Überweisung. Für Steuern auf deine Einnahmen bist du selbst verantwortlich.`,
    terms: 'Nutzungsbedingungen',
    loading: 'Wird geladen…',
  },
});

export function Referral() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<'paypal' | 'iban'>('paypal');
  const [email, setEmail] = useState('');
  const [holder, setHolder] = useState('');
  const [iban, setIban] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => api.referral().then(setInfo, (e: unknown) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []);

  if (!info) return <div className="screen">{error ? <div className="banner bad">{error}</div> : <p className="muted">{T.loading}</p>}</div>;

  const r = info.rules;
  const min = money(r.minPayoutMinor);
  const link = `https://fliplens.eu/${LANG === 'de' ? 'de' : ''}?ref=${info.code}`;
  const b = info.balance;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      track('referral_link_copied', {});
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'FlipLens', text: T.shareText, url: link });
      track('referral_link_shared', {});
    } catch {
      // cancelled or unsupported
    }
  }

  async function requestPayout() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.requestPayout(method === 'paypal' ? { method, email: email.trim() } : { method, holder: holder.trim(), iban: iban.trim() });
      setNotice(T.requestedOk(money(res.requestedMinor, 2)));
      track('referral_payout_requested', {});
      await load();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === 'below_minimum' ? T.belowMin(min) : code === 'invalid_payout_details' ? T.badDetails : errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const canWithdraw = b.availableMinor >= r.minPayoutMinor;
  const detailsOk = method === 'paypal' ? /\S+@\S+\.\S+/.test(email) : holder.trim().length > 1 && iban.replace(/\s/g, '').length >= 15;

  return (
    <div className="screen">
      <h1 className="screen-title">{T.title}</h1>
      <p className="muted">{T.lead(r.sharePct, r.months)}</p>

      <section className="card">
        <h2>{T.yourLink}</h2>
        <div className="ref-link">
          <code>{link.replace('https://', '')}</code>
        </div>
        <div className="ql-add">
          <button type="button" className="ghost" onClick={() => void copy()}>{copied ? T.copied : T.copy}</button>
          {typeof navigator.share === 'function' && <button type="button" className="primary" onClick={() => void share()}>{T.share}</button>}
        </div>
      </section>

      <div className="admin-grid">
        <div className="stat"><span>{T.available}</span><strong>{money(b.availableMinor, 2)}</strong><small>{T.minNote(min)}</small></div>
        <div className="stat"><span>{T.pending}</span><strong>{money(b.pendingMinor, 2)}</strong><small>{T.pendingNote(r.holdDays)}</small></div>
        <div className="stat"><span>{T.invited}</span><strong>{info.signups}</strong><small>{T.paying}: {info.paying}</small></div>
        <div className="stat"><span>{T.paid}</span><strong>{money(b.paidMinor, 2)}</strong><small>{b.requestedMinor > 0 ? `${T.requested}: ${money(b.requestedMinor, 2)}` : ' '}</small></div>
      </div>

      {notice && <div className="banner ok">{notice}</div>}
      {error && <div className="banner bad">{error}</div>}

      {canWithdraw && (
        <section className="card">
          <h2>{T.payoutTitle}</h2>
          <div className="seg" role="radiogroup">
            <button type="button" role="radio" aria-checked={method === 'paypal'} className={method === 'paypal' ? 'on' : ''} onClick={() => setMethod('paypal')}>{T.paypal}</button>
            <button type="button" role="radio" aria-checked={method === 'iban'} className={method === 'iban' ? 'on' : ''} onClick={() => setMethod('iban')}>{T.bank}</button>
          </div>
          {method === 'paypal' ? (
            <label className="field"><span>{T.paypalEmail}</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          ) : (
            <>
              <label className="field"><span>{T.holder}</span><input autoComplete="name" value={holder} onChange={(e) => setHolder(e.target.value)} /></label>
              <label className="field"><span>{T.iban}</span><input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" /></label>
            </>
          )}
          <button type="button" className="primary" disabled={busy || !detailsOk} onClick={() => void requestPayout()}>
            {busy ? T.sending : T.request(money(b.availableMinor, 2))}
          </button>
        </section>
      )}

      <section className="card">
        <h2>{T.history}</h2>
        {info.commissions.length === 0 ? (
          <p className="muted">{T.empty}</p>
        ) : (
          <table className="breakdown">
            <tbody>
              {info.commissions.map((c, i) => (
                <tr key={i}>
                  <td>{date(c.createdAt)}<br /><span className="muted small">{T.payment(money(c.baseMinor, 2))} · {T.status[c.status] ?? c.status}</span></td>
                  <td>+{money(c.commissionMinor, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {info.payouts.length > 0 && (
        <section className="card">
          <h2>{T.payouts}</h2>
          <table className="breakdown">
            <tbody>
              {info.payouts.map((p) => (
                <tr key={p.id}>
                  <td>{date(p.requestedAt)}<br /><span className="muted small">{p.method === 'paypal' ? T.paypal : T.bank} · {T.payoutStatus[p.status] ?? p.status}{p.note ? ` · ${p.note}` : ''}</span></td>
                  <td>{money(p.amountMinor, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="muted small">
        {T.rules(r.sharePct, r.months, r.holdDays, min)} <a href="/terms">{T.terms}</a>
      </p>
    </div>
  );
}
