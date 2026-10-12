import { useState } from 'react';
import type { PlanId } from '@fliplens/core';
import { api, type Account, type BillingInfo } from '../api.js';
import { track } from '../track.js';
import { date, errorText, money, planFeatures, tr } from '../i18n.js';

interface Props {
  billing: BillingInfo | null;
  account: Account | null;
  notice: string | null;
  onSignIn: () => void;
}

const eur = (minor: number): string => money(minor, 2, 'EUR');

const T = tr({
  en: {
    checkoutFail: 'Could not start checkout',
    billingFail: 'Could not open billing',
    plans: 'Plans',
    thisMonth: 'This month',
    used: (u: number, l: number) => `${u} of ${l} checks used · resets on the 1st`,
    ends: 'Ends',
    renews: 'Renews',
    opening: 'Opening…',
    manage: 'Manage subscription',
    popular: 'Popular',
    current: 'Current',
    free: 'Free',
    perMonth: '/ month',
    openingCheckout: 'Opening checkout…',
    get: (n: string) => `Get ${n}`,
    signInToSub: 'Sign in to subscribe',
    switchHint: 'Switch plans in “Manage subscription”.',
    payOff: 'Payments are not configured on this server.',
    footA: 'Final prices, no hidden fees. Cancel anytime. Payments are handled by Stripe. See the ',
    terms: 'Terms',
    footB: ' (incl. 14-day withdrawal right) and ',
    privacy: 'Privacy Policy',
    footC: '.',
  },
  de: {
    checkoutFail: 'Die Bezahlung konnte nicht gestartet werden',
    billingFail: 'Die Abo-Verwaltung konnte nicht geöffnet werden',
    plans: 'Tarife',
    thisMonth: 'Dieser Monat',
    used: (u: number, l: number) => `${u} von ${l} Checks genutzt · Reset am 1.`,
    ends: 'Endet am',
    renews: 'Verlängert sich am',
    opening: 'Wird geöffnet…',
    manage: 'Abo verwalten',
    popular: 'Beliebt',
    current: 'Aktuell',
    free: 'Kostenlos',
    perMonth: '/ Monat',
    openingCheckout: 'Bezahlung wird geöffnet…',
    get: (n: string) => `${n} holen`,
    signInToSub: 'Zum Abonnieren anmelden',
    switchHint: 'Tarif wechseln unter „Abo verwalten“.',
    payOff: 'Zahlungen sind auf diesem Server nicht eingerichtet.',
    footA: 'Endpreise, keine versteckten Gebühren. Jederzeit kündbar. Die Zahlung läuft über Stripe. Siehe ',
    terms: 'Nutzungsbedingungen',
    footB: ' (inkl. 14-tägigem Widerrufsrecht) und ',
    privacy: 'Datenschutzerklärung',
    footC: '.',
  },
});

export function Plans({ billing, account, notice, onSignIn }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!billing) return <div className="screen"><div className="skeleton-list"><div className="skeleton tall" /><div className="skeleton tall" /></div></div>;
  const current = billing.quota.plan;
  const sub = billing.subscription;

  async function upgrade(plan: 'pro' | 'reseller') {
    setError(null);
    setBusy(plan);
    track('subscription_started', { plan, step: 'checkout' });
    try {
      const { url } = await api.checkout(plan);
      window.location.href = url;
    } catch (e) {
      setError(errorText(e, T.checkoutFail));
      setBusy(null);
    }
  }

  async function manage() {
    setError(null);
    setBusy('portal');
    try {
      const { url } = await api.portal();
      window.location.href = url;
    } catch (e) {
      setError(errorText(e, T.billingFail));
      setBusy(null);
    }
  }

  const pct = Math.min(100, Math.round((billing.quota.used / Math.max(1, billing.quota.limit)) * 100));

  return (
    <div className="screen">
      <h1 className="screen-title">{T.plans}</h1>
      {notice && <div className="banner good">{notice}</div>}

      <section className="card">
        <div className="card-head">
          <h2>{T.thisMonth}</h2>
          <span className="pill soft">{billing.plans.find((p) => p.id === current)?.name}</span>
        </div>
        <div className="usage">
          <div className="usage-bar"><div style={{ width: `${pct}%` }} /></div>
          <span className="muted small">{T.used(billing.quota.used, billing.quota.limit)}</span>
        </div>
        {sub && (
          <p className="muted small">
            {sub.cancelAtPeriodEnd ? T.ends : T.renews} {sub.currentPeriodEnd ? date(sub.currentPeriodEnd, { day: 'numeric', month: 'short' }) : ''}
            {sub.status !== 'active' ? ` · ${sub.status.replace('_', ' ')}` : ''}
          </p>
        )}
        {sub && <button type="button" className="ghost wide" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? T.opening : T.manage}</button>}
      </section>

      <div className="plan-list">
        {billing.plans.map((p) => {
          const isCurrent = p.id === current;
          const paid = p.id !== 'free';
          return (
            <section key={p.id} className={`card plan ${p.id === 'pro' ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="card-head">
                <h2>{p.name}</h2>
                {p.id === 'pro' && !isCurrent && <span className="pill d-buy">{T.popular}</span>}
                {isCurrent && <span className="pill soft">{T.current}</span>}
              </div>
              <div className="plan-price">
                <strong>{p.priceMonthlyMinor === 0 ? T.free : eur(p.priceMonthlyMinor)}</strong>
                {p.priceMonthlyMinor > 0 && <span className="muted">{T.perMonth}</span>}
              </div>
              <ul className="list">{planFeatures(p.id as PlanId).map((f) => <li key={f}>{f}</li>)}</ul>
              {paid && !isCurrent && !sub && (
                account ? (
                  <button type="button" className="primary" disabled={!billing.enabled || busy !== null} onClick={() => void upgrade(p.id as 'pro' | 'reseller')}>
                    {busy === p.id ? T.openingCheckout : T.get(p.name)}
                  </button>
                ) : (
                  <button type="button" className="ghost wide" onClick={onSignIn}>{T.signInToSub}</button>
                )
              )}
              {paid && !isCurrent && sub && <p className="muted small">{T.switchHint}</p>}
            </section>
          );
        })}
      </div>
      {error && <div className="banner bad">{error}</div>}
      {!billing.enabled && <p className="muted small center">{T.payOff}</p>}
      <p className="muted small center">
        {T.footA}<a href="/terms">{T.terms}</a>{T.footB}<a href="/privacy">{T.privacy}</a>{T.footC}
      </p>
    </div>
  );
}
