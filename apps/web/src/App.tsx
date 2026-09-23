import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES, CONDITIONS, FEE_PRESETS, type CategorySlug, type Condition, type FeePresetId } from '@fliplens/core';
import { api, ApiError, type ComparableJson, type Health, type ValuationRequest, type ValuationResponse } from './api.js';
import { ago, CONDITION_LABEL, DECISION_LABEL, FACTOR_LABEL, fmt, REASON_LABEL } from './format.js';
import { loadHistory, loadSettings, saveHistory, saveSettings, type HistoryEntry } from './storage.js';
import { PhotoScan } from './PhotoScan.js';
import { MarketLinks } from './MarketLinks.js';
import { LINK_COUNTRIES } from './marketSearch.js';
import type { IdentificationCandidate } from '@fliplens/recognition';

const CAPACITY_CATEGORIES: readonly CategorySlug[] = ['smartphones', 'tablets', 'laptops', 'consoles', 'handhelds'];
const MOUNT_CATEGORIES: readonly CategorySlug[] = ['lenses', 'camera_bodies'];

const DEMO_PRESETS: readonly { label: string; product: ValuationRequest['product']; price: number }[] = [
  { label: 'WH-1000XM4', product: { category: 'headphones', brand: 'Sony', model: 'WH-1000XM4' }, price: 55 },
  { label: 'Switch OLED', product: { category: 'consoles', brand: 'Nintendo', model: 'Switch OLED' }, price: 150 },
  { label: 'iPhone 13 128GB', product: { category: 'smartphones', brand: 'Apple', model: 'iPhone 13', capacity: '128GB' }, price: 290 },
  { label: 'EOS R6', product: { category: 'camera_bodies', brand: 'Canon', model: 'EOS R6' }, price: 900 },
];

interface FormState {
  category: CategorySlug;
  brand: string;
  model: string;
  capacity: string;
  mount: string;
  excludeModels: string;
  condition: Condition;
  purchasePrice: string;
}

const EMPTY_FORM: FormState = {
  category: 'headphones',
  brand: '',
  model: '',
  capacity: '',
  mount: '',
  excludeModels: '',
  condition: 'good',
  purchasePrice: '',
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [settings, setSettings] = useState(loadSettings);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ValuationResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  /** Set while the form holds an AI-recognised product; cleared as soon as the user edits brand/model. */
  const [recognition, setRecognition] = useState<{ confidence: number; modelVersion: string } | null>(null);

  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, []);

  useEffect(() => saveSettings(settings), [settings]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    // A manual edit of the identity means the user has corrected / confirmed it themselves.
    if (k === 'brand' || k === 'model' || k === 'capacity' || k === 'mount' || k === 'category') setRecognition(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  function onPickCandidate(c: IdentificationCandidate, r: { confusableModels: readonly string[]; conditionGuess?: Condition; modelVersion: string }) {
    setForm((f) => ({
      ...f,
      category: c.category,
      brand: c.brand,
      model: c.model,
      capacity: c.capacity ?? '',
      mount: c.mount ?? '',
      excludeModels: r.confusableModels.join(', '),
      condition: r.conditionGuess ?? f.condition,
    }));
    setRecognition({ confidence: c.confidence, modelVersion: r.modelVersion });
  }

  function buildRequest(f: FormState): ValuationRequest {
    const exclude = f.excludeModels.split(',').map((s) => s.trim()).filter(Boolean);
    return {
      product: {
        category: f.category,
        brand: f.brand.trim(),
        model: f.model.trim(),
        ...(f.capacity.trim() && CAPACITY_CATEGORIES.includes(f.category) && { capacity: f.capacity.trim() }),
        ...(f.mount.trim() && MOUNT_CATEGORIES.includes(f.category) && { mount: f.mount.trim() }),
        ...(exclude.length > 0 && { excludeModels: exclude }),
      },
      condition: f.condition,
      purchasePrice: Number(f.purchasePrice.replace(',', '.')),
      currency: 'EUR',
      preset: settings.preset,
      shippingCost: settings.shippingCost,
      targetRoiPct: settings.targetRoiPct,
      source: settings.source,
      ...(recognition && { identificationConfidence: recognition.confidence, recognitionModelVersion: recognition.modelVersion }),
    };
  }

  async function run(req: ValuationRequest) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.valuation(req);
      setResp(r);
      const entry: HistoryEntry = {
        at: new Date().toISOString(),
        request: req,
        summary:
          r.result.status === 'ok'
            ? { decision: r.result.decision.decision, expected: r.result.estimate.expected, profit: r.result.profit.expected.profit }
            : { decision: 'insufficient' },
      };
      setHistory((h) => {
        const next = [entry, ...h].slice(0, 30);
        saveHistory(next);
        return next;
      });
      requestAnimationFrame(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) return setError('Brand and model are required.');
    if (!(Number(form.purchasePrice.replace(',', '.')) >= 0) || form.purchasePrice === '') {
      return setError('Enter the purchase price.');
    }
    void run(buildRequest(form));
  }

  function fillFrom(req: ValuationRequest) {
    setRecognition(null);
    setForm({
      category: req.product.category,
      brand: req.product.brand,
      model: req.product.model,
      capacity: req.product.capacity ?? '',
      mount: req.product.mount ?? '',
      excludeModels: req.product.excludeModels?.join(', ') ?? '',
      condition: req.condition,
      purchasePrice: String(req.purchasePrice),
    });
  }

  const ebayReady = health?.sources.ebay ?? false;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src="/icons/icon.svg" alt="" width={28} height={28} />
          <span>FlipLens</span>
          <span className="tag">internal test</span>
        </div>
        <button className="ghost" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
          Settings
        </button>
      </header>

      {health === null && <div className="banner warn">API not reachable. Run <code>pnpm dev</code> in the repo root.</div>}

      {showSettings && (
        <section className="card">
          <h2>Settings</h2>
          <label className="field">
            <span>Data source</span>
            <div className="seg">
              <button type="button" className={settings.source === 'demo' ? 'on' : ''} onClick={() => setSettings({ ...settings, source: 'demo' })}>
                Demo
              </button>
              <button
                type="button"
                className={settings.source === 'ebay' ? 'on' : ''}
                disabled={!ebayReady}
                onClick={() => setSettings({ ...settings, source: 'ebay' })}
              >
                eBay {ebayReady ? '' : '(no keys)'}
              </button>
            </div>
          </label>
          <label className="field">
            <span>Your country</span>
            <select value={settings.country} onChange={(e) => setSettings({ ...settings, country: e.target.value })}>
              {LINK_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sell on</span>
            <select value={settings.preset} onChange={(e) => setSettings({ ...settings, preset: e.target.value as FeePresetId })}>
              {Object.entries(FEE_PRESETS).map(([id, p]) => (
                <option key={id} value={id}>
                  {id.replace(/_/g, ' ')} ({p.percentageFeeBp / 100}% fee)
                </option>
              ))}
            </select>
          </label>
          <div className="row2">
            <label className="field">
              <span>Typical shipping (€)</span>
              <input inputMode="decimal" value={settings.shippingCost} onChange={(e) => setSettings({ ...settings, shippingCost: Number(e.target.value) || 0 })} />
            </label>
            <label className="field">
              <span>Target ROI (%)</span>
              <input inputMode="numeric" value={settings.targetRoiPct} onChange={(e) => setSettings({ ...settings, targetRoiPct: Number(e.target.value) || 0 })} />
            </label>
          </div>
          <p className="muted small">Pricing {health?.pricingAlgorithmVersion ?? 'n/a'}. Fee presets are unverified placeholders.</p>
        </section>
      )}

      <section className="card">
        <PhotoScan enabled={health?.vision.configured ?? false} onPick={onPickCandidate} />
      </section>

      <form className="card" onSubmit={onSubmit}>
        {recognition && (
          <p className="muted small">
            Recognised with {Math.round(recognition.confidence * 100)}% confidence. Edit any field to correct it.
          </p>
        )}
        {settings.source === 'demo' && (
          <div className="chips">
            {DEMO_PRESETS.map((d) => (
              <button
                key={d.label}
                type="button"
                className="chip"
                onClick={() => fillFrom({ ...buildRequest(form), product: d.product, purchasePrice: d.price, condition: 'good' })}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <div className="row2">
          <label className="field">
            <span>Brand</span>
            <input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Sony" autoCapitalize="words" />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value as CategorySlug)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Model</span>
          <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="WH-1000XM4" />
        </label>
        {CAPACITY_CATEGORIES.includes(form.category) && (
          <label className="field">
            <span>Storage / capacity</span>
            <input value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="128GB" />
          </label>
        )}
        {MOUNT_CATEGORIES.includes(form.category) && (
          <label className="field">
            <span>Mount</span>
            <input value={form.mount} onChange={(e) => set('mount', e.target.value)} placeholder="RF, EF, EF-S, FE" />
          </label>
        )}
        <details className="adv">
          <summary>Exclude similar models</summary>
          <label className="field">
            <span>Comma separated</span>
            <input value={form.excludeModels} onChange={(e) => set('excludeModels', e.target.value)} placeholder="WH-1000XM5, WH-1000XM3" />
          </label>
        </details>

        <div className="field">
          <span>Condition</span>
          <div className="seg wrap">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" className={form.condition === c ? 'on' : ''} onClick={() => set('condition', c)}>
                {CONDITION_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <label className="field big">
          <span>How much can you buy it for?</span>
          <div className="money-input">
            <span>€</span>
            <input inputMode="decimal" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} placeholder="0" />
          </div>
        </label>

        {error && <div className="banner bad">{error}</div>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Checking market…' : 'Should I buy it?'}
        </button>
      </form>

      {resp && <Result resp={resp} />}

      <MarketLinks
        query={[form.brand, form.model, CAPACITY_CATEGORIES.includes(form.category) ? form.capacity : ''].filter((x) => x.trim()).join(' ')}
        country={settings.country}
      />

      {history.length > 0 && (
        <section className="card">
          <h2>History</h2>
          <ul className="history">
            {history.map((h) => (
              <li key={h.at}>
                <button className="ghost row" onClick={() => fillFrom(h.request)}>
                  <span>
                    <strong>
                      {h.request.product.brand} {h.request.product.model} {h.request.product.capacity ?? ''}
                    </strong>
                    <span className="muted small"> €{h.request.purchasePrice} · {ago(h.at)}</span>
                  </span>
                  <span className={`pill d-${h.summary.decision}`}>
                    {h.summary.decision === 'insufficient' ? 'NO DATA' : DECISION_LABEL[h.summary.decision]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Result({ resp }: { resp: ValuationResponse }) {
  const r = resp.result;
  return (
    <section id="result" className="card result">
      {resp.demo && <div className="banner warn">DEMO DATA: synthetic prices for UI testing, not real market data.</div>}
      {resp.sourceWarnings.map((w, i) => (
        <div key={i} className="banner warn small">
          {w.source}
          {w.site ? ` ${w.site}` : ''}: {w.message}
        </div>
      ))}

      {r.status === 'insufficient_data' ? (
        <>
          <div className="decision d-insufficient">Not enough market data</div>
          <p>
            {r.reason === 'too_few_comparables'
              ? `Only ${r.includedCount} matching listings after filtering (need 5).`
              : 'Product identification is too uncertain.'}
          </p>
          <p className="muted">Try: {r.suggestions.map((s) => s.replace(/_/g, ' ')).join(', ')}.</p>
          <Comparables items={r.comparables} />
        </>
      ) : (
        <>
          <div className={`decision d-${r.decision.decision}`}>{DECISION_LABEL[r.decision.decision]}</div>

          <div className="kpis">
            <div>
              <span className="muted small">Expected profit</span>
              <strong className={r.profit.expected.profit.amountMinor >= 0 ? 'pos' : 'neg'}>{fmt(r.profit.expected.profit)}</strong>
            </div>
            <div>
              <span className="muted small">ROI</span>
              <strong>{r.profit.expected.roiPct === null ? 'n/a' : `${r.profit.expected.roiPct}%`}</strong>
            </div>
            <div>
              <span className="muted small">Confidence</span>
              <strong className={`c-${r.estimate.confidence.level}`}>{r.estimate.confidence.level.toUpperCase()}</strong>
            </div>
          </div>

          <div className="range">
            <div>
              <span className="muted small">Fast sale</span>
              <span>{fmt(r.estimate.fast)}</span>
            </div>
            <div className="mid">
              <span className="muted small">Expected</span>
              <strong>{fmt(r.estimate.expected)}</strong>
            </div>
            <div>
              <span className="muted small">High ask</span>
              <span>{fmt(r.estimate.high)}</span>
            </div>
          </div>

          <table className="breakdown">
            <tbody>
              <tr><td>Expected sale</td><td>{fmt(r.profit.expected.salePrice)}</td></tr>
              <tr><td>Marketplace fee</td><td>−{fmt(r.profit.expected.marketplaceFee, 2)}</td></tr>
              <tr><td>Payment fee</td><td>−{fmt(r.profit.expected.paymentFee, 2)}</td></tr>
              <tr><td>Shipping</td><td>−{fmt(r.profit.expected.shipping, 2)}</td></tr>
              <tr className="sum"><td>Net</td><td>{fmt(r.profit.expected.net, 2)}</td></tr>
              <tr><td>Purchase</td><td>−{fmt(r.profit.expected.purchasePrice, 2)}</td></tr>
              <tr className="sum"><td>Profit</td><td>{fmt(r.profit.expected.profit, 2)}</td></tr>
              {r.maxBuyPrice && (
                <tr><td>Max buy for target ROI</td><td>{fmt(r.maxBuyPrice)}</td></tr>
              )}
            </tbody>
          </table>
          {!resp.feePreset.verified && <p className="muted small">Fee preset "{resp.feePreset.id}" is not verified yet.</p>}

          <div className="twocol">
            <div>
              <h3>Why</h3>
              <ul className="list">{r.decision.factors.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div>
              <h3>Risks</h3>
              {r.decision.risks.length === 0 ? <p className="muted">None flagged</p> : <ul className="list">{r.decision.risks.map((f) => <li key={f}>{f}</li>)}</ul>}
            </div>
          </div>

          <details className="adv">
            <summary>Confidence {r.estimate.confidence.score} breakdown</summary>
            <ul className="factors">
              {r.estimate.confidence.factors.map((f) => (
                <li key={f.name}>
                  <span>{FACTOR_LABEL[f.name] ?? f.name}</span>
                  <span className="muted small">{String(f.input)}</span>
                  <meter min={0} max={1} value={f.value} />
                  <span className="small">{f.value.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </details>

          <p className="muted small">
            Based on {r.estimate.distribution.count} {r.estimate.dataKind === 'sold' ? 'sold items' : 'active listings (asking prices)'} ·
            data {ago(resp.dataFetchedAt)} · FX {resp.fx.source.toUpperCase()} {resp.fx.rateDate} · {r.pricingAlgorithmVersion}
          </p>
          {r.estimate.warnings.map((w) => <p key={w} className="muted small">{w}</p>)}

          <Comparables items={r.estimate.comparables} />
        </>
      )}
    </section>
  );
}

function Comparables({ items }: { items: ComparableJson[] }) {
  const included = useMemo(
    () => items.filter((c) => c.included).sort((a, b) => b.similarity - a.similarity || (a.adjustedPrice?.amountMinor ?? 0) - (b.adjustedPrice?.amountMinor ?? 0)),
    [items],
  );
  const excluded = useMemo(() => items.filter((c) => !c.included), [items]);
  const byReason = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of excluded) {
      const k = c.exclusionReason ?? c.role;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [excluded]);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? included : included.slice(0, 12);

  return (
    <div className="comps">
      <h3>Comparables ({included.length} used)</h3>
      <ul className="comp-list">
        {shown.map((c) => (
          <li key={`${c.item.source}:${c.item.externalId}`}>
            <div className="comp-top">
              <strong>{c.priceTarget ? fmt(c.priceTarget) : '?'}</strong>
              {c.adjustedPrice && c.priceTarget && c.adjustedPrice.amountMinor !== c.priceTarget.amountMinor && (
                <span className="muted small"> → {fmt(c.adjustedPrice)} adj.</span>
              )}
              <span className="muted small right">
                {c.item.country ?? '?'} · {c.item.condition ? CONDITION_LABEL[c.item.condition] : 'no condition'} · sim {c.similarity}
              </span>
            </div>
            <div className="comp-title">
              {c.item.url ? (
                <a href={c.item.url} target="_blank" rel="noreferrer">{c.item.title}</a>
              ) : (
                c.item.title
              )}
            </div>
            <div className="muted small">{c.item.marketplaceSite} · listed {ago(c.item.listedAt ?? null)}</div>
          </li>
        ))}
      </ul>
      {included.length > 12 && (
        <button className="ghost" onClick={() => setShowAll((s) => !s)}>{showAll ? 'Show less' : `Show all ${included.length}`}</button>
      )}

      {excluded.length > 0 && (
        <details className="adv">
          <summary>Excluded {excluded.length}: {byReason.map(([k, n]) => `${REASON_LABEL[k] ?? k} ${n}`).join(', ')}</summary>
          <ul className="comp-list excluded">
            {excluded.map((c) => (
              <li key={`${c.item.source}:${c.item.externalId}`}>
                <div className="comp-top">
                  <span>{fmt(c.priceTarget ?? c.item.price)}</span>
                  <span className="pill small">{REASON_LABEL[c.exclusionReason ?? ''] ?? c.role}{c.exclusionDetail ? `: ${c.exclusionDetail}` : ''}</span>
                </div>
                <div className="comp-title">{c.item.title}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
