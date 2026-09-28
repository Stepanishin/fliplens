import { useState } from 'react';
import { api, ApiError, type Account, type BillingInfo } from '../api.js';
import { track } from '../track.js';

interface Props {
  billing: BillingInfo | null;
  account: Account | null;
  notice: string | null;
  onSignIn: () => void;
}

const eur = (minor: number): string => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(minor / 100);

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
      setError(e instanceof ApiError ? e.message : 'Could not start checkout');
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
      setError(e instanceof ApiError ? e.message : 'Could not open billing');
      setBusy(null);
    }
  }

  const pct = Math.min(100, Math.round((billing.quota.used / Math.max(1, billing.quota.limit)) * 100));

  return (
    <div className="screen">
      <h1 className="screen-title">Plans</h1>
      {notice && <div className="banner good">{notice}</div>}

      <section className="card">
        <div className="card-head">
          <h2>This month</h2>
          <span className="pill soft">{billing.plans.find((p) => p.id === current)?.name}</span>
        </div>
        <div className="usage">
          <div className="usage-bar"><div style={{ width: `${pct}%` }} /></div>
          <span className="muted small">{billing.quota.used} of {billing.quota.limit} checks used · resets on the 1st</span>
        </div>
        {sub && (
          <p className="muted small">
            {sub.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : ''}
            {sub.status !== 'active' ? ` · ${sub.status.replace('_', ' ')}` : ''}
          </p>
        )}
        {sub && <button type="button" className="ghost wide" disabled={busy !== null} onClick={() => void manage()}>{busy === 'portal' ? 'Opening…' : 'Manage subscription'}</button>}
      </section>

      <div className="plan-list">
        {billing.plans.map((p) => {
          const isCurrent = p.id === current;
          const paid = p.id !== 'free';
          return (
            <section key={p.id} className={`card plan ${p.id === 'pro' ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="card-head">
                <h2>{p.name}</h2>
                {p.id === 'pro' && !isCurrent && <span className="pill d-buy">Popular</span>}
                {isCurrent && <span className="pill soft">Current</span>}
              </div>
              <div className="plan-price">
                <strong>{p.priceMonthlyMinor === 0 ? 'Free' : eur(p.priceMonthlyMinor)}</strong>
                {p.priceMonthlyMinor > 0 && <span className="muted">/ month</span>}
              </div>
              <ul className="list">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {paid && !isCurrent && !sub && (
                account ? (
                  <button type="button" className="primary" disabled={!billing.enabled || busy !== null} onClick={() => void upgrade(p.id as 'pro' | 'reseller')}>
                    {busy === p.id ? 'Opening checkout…' : `Get ${p.name}`}
                  </button>
                ) : (
                  <button type="button" className="ghost wide" onClick={onSignIn}>Sign in to subscribe</button>
                )
              )}
              {paid && !isCurrent && sub && <p className="muted small">Switch plans in “Manage subscription”.</p>}
            </section>
          );
        })}
      </div>
      {error && <div className="banner bad">{error}</div>}
      {!billing.enabled && <p className="muted small center">Payments are not configured on this server.</p>}
      <p className="muted small center">
        Prices include VAT. Cancel anytime. Payments are handled by Stripe. See the <a href="/terms">Terms</a> (incl. 14-day withdrawal right) and <a href="/privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}
