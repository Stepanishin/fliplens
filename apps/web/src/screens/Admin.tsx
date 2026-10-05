import { useEffect, useState } from 'react';
import { PLANS } from '@fliplens/core';
import { api, ApiError, type AdminOverview, type AdminTraffic, type AdminUserDetail, type AdminUserRow } from '../api.js';
import { ago, DECISION_LABEL } from '../format.js';
import { eur } from '../ui/verdict.js';

const usd = (n: number, d = 2): string => `$${n.toFixed(d)}`;
const pct = (a: number, b: number): string => (b > 0 ? `${Math.round((a / b) * 100)}%` : 'n/a');
const day = (iso: string): string => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (iso: string): string => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const decision = (d: string | null): string => (d ? (DECISION_LABEL[d as keyof typeof DECISION_LABEL] ?? d) : 'no data');
/** Price after VAT (~20%) and Stripe (~1.5% + €0.25 + 0.7%), in euro: for a rough margin line only. */
const netRevenueEur = (priceMinor: number): number => (priceMinor === 0 ? 0 : (priceMinor / 100) / 1.2 * (1 - 0.022) - 0.25);

type Tab = 'overview' | 'traffic' | 'users';

/** Internal numbers for the operator: users, traffic, revenue, costs. Visible only to ADMIN_EMAILS. */
export function Admin() {
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);

  return (
    <div className="screen">
      <div className="card-head">
        <h1 className="screen-title">Admin</h1>
        {tab !== 'users' && (
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period" style={{ width: 'auto' }}>
            <option value={1}>Today</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        )}
      </div>
      <div className="seg" role="tablist" aria-label="Admin sections">
        {(['overview', 'traffic', 'users'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'traffic' ? 'Traffic' : 'Users'}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview days={days} />}
      {tab === 'traffic' && <Traffic days={days} />}
      {tab === 'users' && <Users />}
    </div>
  );
}

function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    load().then(
      (d) => live && setData(d),
      (e: unknown) => live && setError(e instanceof ApiError ? e.message : 'Failed to load'),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

function Loading({ error }: { error: string | null }) {
  if (error) return <div className="banner bad">{error}</div>;
  return <div className="skeleton-list"><div className="skeleton tall" /><div className="skeleton tall" /></div>;
}

// ---------- overview ----------

function Overview({ days }: { days: number }) {
  const { data, error } = useLoad<AdminOverview>(() => api.adminOverview(days), [days]);
  if (!data) return <Loading error={error} />;

  const aiUsd = (data.cost.byKind.vision?.usd ?? 0) + (data.cost.byKind.text_llm?.usd ?? 0);
  const perCheck = data.valuations.total > 0 ? aiUsd / data.valuations.total : null;
  const paying = data.revenue.byPlan.reduce((a, p) => a + p.active, 0);
  const ending = data.revenue.byPlan.reduce((a, p) => a + p.ending, 0);

  return (
    <>
      <div className="admin-grid">
        <div className="stat"><span>MRR</span><strong>€{data.revenue.mrrEur.toFixed(2)}</strong><small>{paying} paying{ending > 0 ? ` · ${ending} ending` : ''}</small></div>
        <div className="stat"><span>Signed-in users</span><strong>{data.users.signedIn}</strong><small>{data.users.activeInPeriod} active in period</small></div>
        <div className="stat"><span>Paying by plan</span><strong>{paying}</strong><small>Pro {data.plans.pro ?? 0} · Reseller {data.plans.reseller ?? 0}</small></div>
        <div className="stat"><span>Checks</span><strong>{data.valuations.total}</strong><small>{pct(data.valuations.insufficient, data.valuations.total)} without enough data</small></div>
        <div className="stat"><span>Recognitions</span><strong>{data.identifications.total}</strong><small>photo {data.identifications.photo} · barcode {data.identifications.barcode}</small></div>
        <div className="stat"><span>AI cost</span><strong>{usd(aiUsd)}</strong><small>{perCheck === null ? 'n/a' : `${usd(perCheck, 4)} per check`}</small></div>
        <div className="stat"><span>Escalated to strong model</span><strong>{pct(data.identifications.escalated, data.identifications.photo)}</strong><small>of photo recognitions</small></div>
        <div className="stat"><span>Corrected by users</span><strong>{pct(data.identifications.corrected, data.identifications.decided)}</strong><small>of recognitions used in a check</small></div>
        <div className="stat"><span>eBay calls today</span><strong>{data.ebayCallsToday}</strong><small>default limit ~5,000 / day</small></div>
      </div>

      <section className="card">
        <h2>Latest checks</h2>
        <table className="breakdown admin-table">
          <tbody>
            {data.recentChecks.map((c, i) => (
              <tr key={i}>
                <td>
                  {c.brand} {c.model}
                  <br />
                  <span className="muted small">{c.email ?? 'n/a'} · {ago(c.createdAt)}</span>
                </td>
                <td>{eur(c.priceMinor)}<br /><span className="muted small">{decision(c.decision)}</span></td>
              </tr>
            ))}
            {data.recentChecks.length === 0 && <tr><td colSpan={2} className="muted">No checks yet.</td></tr>}
          </tbody>
        </table>
      </section>

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
        <p className="muted small">If every check is used. VAT ~20% and Stripe fees estimated; USD→EUR 0.92. AI spend per user is capped by the plan budget.</p>
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
    </>
  );
}

// ---------- traffic ----------

function Traffic({ days }: { days: number }) {
  const { data, error } = useLoad<AdminTraffic>(() => api.adminTraffic(days), [days]);
  if (!data) return <Loading error={error} />;
  const f = data.funnel;

  return (
    <>
      <div className="admin-grid">
        <div className="stat"><span>Unique visitors</span><strong>{data.uniqueVisitors}</strong><small>{data.visits} visits</small></div>
        <div className="stat"><span>Page views</span><strong>{data.pageViews}</strong><small>{data.visits > 0 ? (data.pageViews / data.visits).toFixed(1) : 'n/a'} per visit</small></div>
        <div className="stat"><span>Mobile</span><strong>{pct(data.devices.mobile, data.devices.mobile + data.devices.desktop)}</strong><small>{data.devices.standalone} visits from the installed app</small></div>
        <div className="stat"><span>App installs</span><strong>{data.installs}</strong><small>PWA added to home screen</small></div>
      </div>

      {data.daily.length > 1 && (
        <section className="card">
          <h2>Per day</h2>
          <DailyBars title="Unique visitors" points={data.daily.map((d) => ({ day: d.day, n: d.visitors }))} />
          <DailyBars title="New sign-ups" points={data.daily.map((d) => ({ day: d.day, n: d.signups }))} />
          <DailyBars title="Checks" points={data.daily.map((d) => ({ day: d.day, n: d.checks }))} />
          <details className="admin-details">
            <summary>Show as table</summary>
            <table className="breakdown">
              <thead><tr><th>Day</th><th>Visitors</th><th>Sign-ups</th><th>Checks</th></tr></thead>
              <tbody>
                {[...data.daily].reverse().map((d) => <tr key={d.day}><td>{day(d.day)}</td><td>{d.visitors}</td><td>{d.signups}</td><td>{d.checks}</td></tr>)}
              </tbody>
            </table>
          </details>
        </section>
      )}

      <section className="card">
        <h2>Funnel (new in period)</h2>
        <Funnel
          steps={[
            { label: 'Visitors', n: f.visitors },
            { label: 'Signed up', n: f.signups },
            { label: 'Ran a check', n: f.activated },
            { label: 'Paying', n: f.paying },
          ]}
        />
        <p className="muted small">Visitors count every device seen in the period (tracked since 5 Oct 2026); the other steps count accounts created in the period. A step can exceed the one before while the visitor history is short.</p>
      </section>

      <TopList title="Where visitors come from" rows={data.referrers} empty="No visits recorded yet." />
      {data.campaigns.length > 0 && <TopList title="Campaigns (utm_source)" rows={data.campaigns} empty="" />}
      <TopList title="Screens viewed" rows={data.pages} empty="No page views recorded yet." />
    </>
  );
}

/** One series per chart (small multiples, one axis each). Hover or focus a day for its value. */
function DailyBars({ title, points }: { title: string; points: { day: string; n: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.n));
  const total = points.reduce((a, p) => a + p.n, 0);
  const w = 300;
  const h = 64;
  const step = w / points.length;
  const gap = Math.min(2, step * 0.3);
  const shown = hover !== null ? points[hover] : undefined;

  return (
    <figure className="daily">
      <figcaption>
        <span>{title}</span>
        <span className="muted">{shown ? `${day(shown.day)}: ${shown.n}` : `${total} total · max ${max}`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${title} per day, ${total} in total`} onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={w} y1={h - 0.5} y2={h - 0.5} className="daily-axis" />
        {points.map((p, i) => {
          const bh = p.n === 0 ? 0 : Math.max(2, (p.n / max) * (h - 4));
          return (
            <g key={p.day} onMouseEnter={() => setHover(i)}>
              <rect x={i * step} y={0} width={step} height={h} fill="transparent" />
              {bh > 0 && <rect x={i * step + gap / 2} y={h - bh} width={Math.max(1, step - gap)} height={bh} rx={Math.min(2, (step - gap) / 2)} className={hover === i ? 'daily-bar on' : 'daily-bar'} />}
            </g>
          );
        })}
      </svg>
      <div className="daily-x muted small">
        <span>{day(points[0]!.day)}</span>
        <span>{day(points[points.length - 1]!.day)}</span>
      </div>
    </figure>
  );
}

function Funnel({ steps }: { steps: { label: string; n: number }[] }) {
  const top = Math.max(1, ...steps.map((s) => s.n));
  return (
    <div className="funnel">
      {steps.map((s, i) => (
        <div key={s.label} className="funnel-row">
          <span className="funnel-label">{s.label}</span>
          <span className="funnel-track"><span className="funnel-bar" style={{ width: `${Math.max(s.n > 0 ? 2 : 0, (s.n / top) * 100)}%` }} /></span>
          <span className="funnel-n">
            <strong>{s.n}</strong>
            {i > 0 && s.n <= steps[i - 1]!.n && <span className="muted small"> {pct(s.n, steps[i - 1]!.n)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopList({ title, rows, empty }: { title: string; rows: { name: string; n: number }[]; empty: string }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <table className="breakdown">
        <tbody>
          {rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.n}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={2} className="muted">{empty}</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

// ---------- users ----------

function Users() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setList(null);
    api.adminUsers(query).then(
      (r) => {
        setList(r.users);
        setTotal(r.total);
      },
      (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load'),
    );
  }, [query]);

  function more() {
    if (!list) return;
    api.adminUsers(query, list.length).then((r) => setList([...list, ...r.users]), () => undefined);
  }

  if (open) return <UserDetail id={open} onBack={() => setOpen(null)} />;

  return (
    <>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name" aria-label="Search users" />
      {!list ? (
        <Loading error={error} />
      ) : (
        <section className="card">
          <h2>{total} signed-in user{total === 1 ? '' : 's'}</h2>
          <div className="admin-users">
            {list.map((u) => (
              <button key={u.id} type="button" className="admin-user" onClick={() => setOpen(u.id)}>
                <span className="avatar">{(u.name ?? u.email ?? '?').slice(0, 1).toUpperCase()}</span>
                <span className="admin-user-main">
                  <strong>{u.email ?? 'n/a'}</strong>
                  <span className="muted small">
                    {u.checks} checks · {u.stock} in stock · seen {ago(u.lastSeenAt)}
                  </span>
                </span>
                <span className={`plan-badge ${u.plan}`}>{u.plan}</span>
              </button>
            ))}
            {list.length === 0 && <p className="muted">No users found.</p>}
          </div>
          {list.length < total && <button type="button" className="ghost wide" onClick={more}>Show more</button>}
        </section>
      )}
    </>
  );
}

function UserDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, error } = useLoad<AdminUserDetail>(() => api.adminUser(id), [id]);
  return (
    <>
      <button type="button" className="link" onClick={onBack}>← All users</button>
      {!data ? (
        <Loading error={error} />
      ) : (
        <UserDetailBody d={data} />
      )}
    </>
  );
}

function UserDetailBody({ d }: { d: AdminUserDetail }) {
  const u = d.user;
  return (
    <>
      <section className="card">
        <div className="admin-user head">
          <span className="avatar">{(u.name ?? u.email ?? '?').slice(0, 1).toUpperCase()}</span>
          <span className="admin-user-main">
            <strong>{u.name ?? u.email}</strong>
            <span className="muted small">{u.email}</span>
          </span>
          <span className={`plan-badge ${u.plan}`}>{u.plan}</span>
        </div>
        <table className="breakdown">
          <tbody>
            <tr><td>Signed up</td><td>{when(u.createdAt)}</td></tr>
            <tr><td>Last seen</td><td>{ago(u.lastSeenAt)}</td></tr>
            <tr><td>Devices</td><td>{u.devices}</td></tr>
            <tr><td>Country</td><td>{d.settings?.country ?? 'n/a'}</td></tr>
            <tr><td>Sells on</td><td>{d.settings?.feePreset ?? 'n/a'}</td></tr>
            <tr><td>AI cost this month / total</td><td>{usd(d.costThisMonthUsd, 3)} / {usd(u.costUsd, 3)}</td></tr>
          </tbody>
        </table>
      </section>

      <div className="admin-grid">
        <div className="stat"><span>Checks</span><strong>{u.checks}</strong><small>{u.checks30d} in 30 days</small></div>
        <div className="stat"><span>Recognitions</span><strong>{u.recognitions}</strong><small>photo and barcode</small></div>
        <div className="stat"><span>In stock</span><strong>{u.stock}</strong><small>{u.sold} sold</small></div>
      </div>

      <section className="card">
        <h2>Subscription</h2>
        {d.subscription ? (
          <table className="breakdown">
            <tbody>
              <tr><td>Plan</td><td>{d.subscription.plan} · {d.subscription.status}</td></tr>
              <tr><td>{d.subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}</td><td>{d.subscription.currentPeriodEnd ? when(d.subscription.currentPeriodEnd) : 'n/a'}</td></tr>
            </tbody>
          </table>
        ) : (
          <p className="muted">Never subscribed.</p>
        )}
        {d.stripeCustomerId && (
          <a className="link" href={`https://dashboard.stripe.com/customers/${d.stripeCustomerId}`} target="_blank" rel="noreferrer">Open in Stripe</a>
        )}
      </section>

      <section className="card">
        <h2>Recent checks</h2>
        <table className="breakdown admin-table">
          <tbody>
            {d.scans.map((s) => (
              <tr key={s.id}>
                <td>{s.brand} {s.model}<br /><span className="muted small">{s.method} · {ago(s.createdAt)}</span></td>
                <td>
                  {eur(s.priceMinor)}
                  <br />
                  <span className="muted small">{decision(s.decision)}{s.profitMinor !== null ? ` · ${s.profitMinor >= 0 ? '+' : ''}${eur(s.profitMinor)}` : ''}</span>
                </td>
              </tr>
            ))}
            {d.scans.length === 0 && <tr><td colSpan={2} className="muted">No checks yet.</td></tr>}
          </tbody>
        </table>
      </section>

      {d.inventory.length > 0 && (
        <section className="card">
          <h2>Stock</h2>
          <table className="breakdown">
            <tbody>
              {d.inventory.map((i) => (
                <tr key={i.status}><td>{i.status.replace(/_/g, ' ')} · {i.n}</td><td>paid {eur(i.purchaseMinor)}{i.soldMinor > 0 ? ` · sold ${eur(i.soldMinor)}` : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Activity</h2>
        <table className="breakdown admin-table">
          <tbody>
            {d.events.map((e, i) => (
              <tr key={i}><td>{e.name}{typeof e.props.page === 'string' ? ` · ${e.props.page}` : ''}</td><td className="muted small">{ago(e.createdAt)}</td></tr>
            ))}
            {d.events.length === 0 && <tr><td colSpan={2} className="muted">No events yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
