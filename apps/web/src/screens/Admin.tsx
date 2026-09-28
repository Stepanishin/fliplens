import { useEffect, useState } from 'react';
import { PLANS } from '@fliplens/core';
import { api, ApiError, type AdminOverview } from '../api.js';

const usd = (n: number, d = 2): string => `$${n.toFixed(d)}`;
const pct = (a: number, b: number): string => (b > 0 ? `${Math.round((a / b) * 100)}%` : 'n/a');
/** Price after VAT (~20%) and Stripe (~1.5% + €0.25 + 0.7%), in euro: for a rough margin line only. */
const netRevenueEur = (priceMinor: number): number => (priceMinor === 0 ? 0 : (priceMinor / 100) / 1.2 * (1 - 0.022) - 0.25);

/** Internal numbers for the operator: costs, usage, conversion. Visible only to ADMIN_EMAILS. */
export function Admin() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api.adminOverview(days).then(setData, (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load'));
  }, [days]);

  if (error) return <div className="screen"><div className="banner bad">{error}</div></div>;
  if (!data) return <div className="screen"><div className="skeleton-list"><div className="skeleton tall" /><div className="skeleton tall" /></div></div>;

  const aiUsd = (data.cost.byKind.vision?.usd ?? 0) + (data.cost.byKind.text_llm?.usd ?? 0);
  const perCheck = data.valuations.total > 0 ? aiUsd / data.valuations.total : null;

  return (
    <div className="screen">
      <div className="card-head">
        <h1 className="screen-title">Admin</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period" style={{ width: 'auto' }}>
          <option value={1}>Today</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      <div className="admin-grid">
        <div className="stat"><span>Signed-in users</span><strong>{data.users.signedIn}</strong><small>{data.users.activeInPeriod} active in period</small></div>
        <div className="stat"><span>Paying</span><strong>{(data.plans.pro ?? 0) + (data.plans.reseller ?? 0)}</strong><small>Pro {data.plans.pro ?? 0} · Reseller {data.plans.reseller ?? 0}</small></div>
        <div className="stat"><span>Checks</span><strong>{data.valuations.total}</strong><small>{pct(data.valuations.insufficient, data.valuations.total)} without enough data</small></div>
        <div className="stat"><span>Recognitions</span><strong>{data.identifications.total}</strong><small>photo {data.identifications.photo} · barcode {data.identifications.barcode}</small></div>
        <div className="stat"><span>AI cost</span><strong>{usd(aiUsd)}</strong><small>{perCheck === null ? 'n/a' : `${usd(perCheck, 4)} per check`}</small></div>
        <div className="stat"><span>Escalated to strong model</span><strong>{pct(data.identifications.escalated, data.identifications.photo)}</strong><small>of photo recognitions</small></div>
        <div className="stat"><span>Corrected by users</span><strong>{pct(data.identifications.corrected, data.identifications.decided)}</strong><small>of recognitions used in a check</small></div>
        <div className="stat"><span>eBay calls today</span><strong>{data.ebayCallsToday}</strong><small>default limit ~5,000 / day</small></div>
      </div>

      <section className="card">
        <h2>Margin per plan (at current cost per check)</h2>
        <table className="breakdown">
          <tbody>
            {Object.values(PLANS).map((p) => {
              const cost = perCheck === null ? null : (perCheck * p.monthlyValuations) * 0.92;
              const net = netRevenueEur(p.priceMonthlyMinor);
              return (
                <tr key={p.id}>
                  <td>{p.name} · {p.monthlyValuations} checks</td>
                  <td>{cost === null ? 'n/a' : `net €${net.toFixed(2)} − AI €${cost.toFixed(2)} = €${(net - cost).toFixed(2)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted small">If every check is used. VAT ~20% and Stripe fees estimated; USD→EUR 0.92.</p>
      </section>

      <section className="card">
        <h2>Top users by cost</h2>
        <table className="breakdown admin-table">
          <tbody>
            {data.topUsers.map((u, i) => (
              <tr key={i}>
                <td>{u.email ?? 'n/a'}<br /><span className="muted small">{u.plan} · {u.valuations} checks · {u.identifications} recognitions</span></td>
                <td>{usd(u.costUsd, 3)}</td>
              </tr>
            ))}
            {data.topUsers.length === 0 && <tr><td colSpan={2} className="muted">No signed-in users yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Events</h2>
        <table className="breakdown">
          <tbody>
            {Object.entries(data.events.byName).sort((a, b) => b[1] - a[1]).map(([k, n]) => <tr key={k}><td>{k}</td><td>{n}</td></tr>)}
          </tbody>
        </table>
      </section>
    </div>
  );
}
