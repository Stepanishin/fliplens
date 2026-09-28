import { useEffect, useState } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import { api, ApiError, type InventoryItem, type InventoryStatus, type InventorySummary } from '../api.js';
import { ago } from '../format.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';
import { eur } from '../ui/verdict.js';

export const STATUS_LABEL: Record<InventoryStatus, string> = {
  bought: 'Bought',
  ready_to_list: 'Ready to list',
  listed: 'Listed',
  sold: 'Sold',
  returned: 'Returned',
  discarded: 'Discarded',
};
const FILTERS: readonly ('active' | InventoryStatus)[] = ['active', 'listed', 'sold', 'returned', 'discarded'];
const FILTER_LABEL: Record<string, string> = { active: 'In stock', listed: 'Listed', sold: 'Sold', returned: 'Returned', discarded: 'Discarded' };
const isActive = (s: InventoryStatus) => s === 'bought' || s === 'ready_to_list' || s === 'listed';
const num = (s: string): number => Number(s.replace(',', '.'));

interface Props {
  settings: Settings;
  onCreateListing?: (item: InventoryItem) => void;
}

/** Stock: what you bought, what it cost, what it should bring, and what it really sold for. */
export function Inventory({ settings, onCreateListing }: Props) {
  const [data, setData] = useState<{ items: InventoryItem[]; summary: InventorySummary } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('active');
  const [open, setOpen] = useState<InventoryItem | null>(null);

  const load = () => api.inventory().then(setData, (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load stock'));
  useEffect(() => {
    void load();
  }, []);

  if (error) return <div className="screen"><div className="banner bad">{error}</div></div>;
  if (!data) return <div className="screen"><h1 className="screen-title">Stock</h1><div className="skeleton-list"><div className="skeleton tall" /><div className="skeleton" /></div></div>;

  const { summary: s } = data;
  const shown = data.items.filter((i) => (filter === 'active' ? isActive(i.status) : i.status === filter));

  return (
    <div className="screen">
      <h1 className="screen-title">Stock</h1>

      <div className="stock-summary">
        <div className="stat-card">
          <span>In stock</span>
          <strong>{s.active.items}</strong>
          <small>invested {eur(s.active.investedMinor)}</small>
        </div>
        <div className="stat-card">
          <span>Expected profit</span>
          <strong className={s.active.expectedProfitMinor >= 0 ? 'pos' : 'neg'}>{eur(s.active.expectedProfitMinor)}</strong>
          <small>revenue {eur(s.active.expectedRevenueMinor)}</small>
        </div>
        <div className="stat-card">
          <span>Realised profit</span>
          <strong className={s.sold.profitMinor >= 0 ? 'pos' : 'neg'}>{eur(s.sold.profitMinor)}</strong>
          <small>{s.sold.items} sold{s.sold.avgDaysToSell !== null ? ` · ~${s.sold.avgDaysToSell} d to sell` : ''}</small>
        </div>
        <div className="stat-card">
          <span>Estimate accuracy</span>
          <strong>{s.sold.avgPredictionErrorPct === null ? 'n/a' : `±${s.sold.avgPredictionErrorPct}%`}</strong>
          <small>real sale vs. our estimate</small>
        </div>
      </div>

      <div className="chips-row filter-row" role="tablist">
        {FILTERS.map((f) => {
          const n = f === 'active' ? s.active.items : s.counts[f];
          return (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={`chip-btn ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {FILTER_LABEL[f]} {n > 0 ? n : ''}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          {data.items.length === 0 ? 'Nothing here yet. After a check, tap "I bought it" to track the item until it sells.' : 'No items in this list.'}
        </div>
      ) : (
        <ul className="recent">
          {shown.map((i) => (
            <li key={i.id}>
              <button type="button" className={`recent-row st-${i.status}`} onClick={() => setOpen(i)}>
                <span className="recent-main">
                  <strong>{i.brand} {i.model}{i.capacity ? ` ${i.capacity}` : ''}</strong>
                  <span className="muted small">
                    €{i.purchasePriceMinor / 100}
                    {i.status === 'sold' && i.soldPriceMinor !== null ? ` → sold €${i.soldPriceMinor / 100}` : i.expectedSaleMinor ? ` → ~${eur(i.expectedSaleMinor)}` : ''}
                    {' · '}{ago(i.status === 'sold' && i.soldAt ? i.soldAt : i.purchasedAt)}
                  </span>
                </span>
                <span className="recent-side">
                  <span className="pill soft">{STATUS_LABEL[i.status]}</span>
                  {(i.actualProfitMinor ?? i.expectedProfitMinor) !== null && (
                    <span className={`recent-profit ${(i.actualProfitMinor ?? i.expectedProfitMinor)! >= 0 ? 'pos' : 'neg'}`}>
                      {(i.actualProfitMinor ?? i.expectedProfitMinor)! >= 0 ? '+' : '−'}{eur(Math.abs((i.actualProfitMinor ?? i.expectedProfitMinor)!))}
                      {i.actualProfitMinor === null ? ' exp.' : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ItemSheet
          item={open}
          settings={settings}
          onClose={() => setOpen(null)}
          onChanged={(updated) => {
            setOpen(updated);
            void load();
          }}
          onDeleted={() => {
            setOpen(null);
            void load();
          }}
          {...(onCreateListing && { onCreateListing })}
        />
      )}
    </div>
  );
}

function ItemSheet({
  item,
  settings,
  onClose,
  onChanged,
  onDeleted,
  onCreateListing,
}: {
  item: InventoryItem;
  settings: Settings;
  onClose: () => void;
  onChanged: (i: InventoryItem) => void;
  onDeleted: () => void;
  onCreateListing?: (item: InventoryItem) => void;
}) {
  const preset = FEE_PRESETS[settings.preset];
  const [mode, setMode] = useState<'view' | 'list' | 'sell'>('view');
  const [listedOn, setListedOn] = useState(item.listedOn ?? preset.label);
  const [listedPrice, setListedPrice] = useState(item.listedPriceMinor ? String(item.listedPriceMinor / 100) : item.expectedSaleMinor ? String(Math.round(item.expectedSaleMinor / 100)) : '');
  const [soldPrice, setSoldPrice] = useState(item.soldPriceMinor ? String(item.soldPriceMinor / 100) : item.listedPriceMinor ? String(item.listedPriceMinor / 100) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggested sale costs from the user's usual marketplace (editable).
  const profile = preset.resolve(item.condition, item.category);
  const suggestFees = (price: number) => Math.round((price * profile.percentageFeeBp) / 100) / 100 + (price > 0 ? profile.fixedFeeMinor / 100 : 0);
  const [fees, setFees] = useState(item.saleFeesMinor !== null ? String(item.saleFeesMinor / 100) : '');
  const [ship, setShip] = useState(item.saleShippingMinor !== null ? String(item.saleShippingMinor / 100) : profile.sellerPaysShipping ? String(settings.shippingCost) : '0');
  const feesValue = fees === '' ? suggestFees(num(soldPrice) || 0) : num(fees);
  const profitPreview = (num(soldPrice) || 0) - feesValue - (num(ship) || 0) - item.purchasePriceMinor / 100;

  async function patch(p: Parameters<typeof api.patchInventory>[1], event?: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patchInventory(item.id, p);
      if (event) track(event, { status: p.status ?? null });
      setMode('view');
      onChanged(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={`${item.brand} ${item.model}`} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>{item.brand} {item.model}</h2>
          <span className="pill soft">{STATUS_LABEL[item.status]}</span>
        </div>
        <table className="breakdown">
          <tbody>
            <tr><td>Bought</td><td>{eur(item.purchasePriceMinor, 2)} · {new Date(item.purchasedAt).toLocaleDateString('en-IE')}{item.source ? ` · ${item.source}` : ''}</td></tr>
            {item.expectedSaleMinor !== null && <tr><td>Estimate at purchase</td><td>{eur(item.expectedSaleMinor)} (profit {eur(item.expectedProfitMinor ?? 0)})</td></tr>}
            {item.listedPriceMinor !== null && <tr><td>Listed</td><td>{eur(item.listedPriceMinor)} on {item.listedOn}</td></tr>}
            {item.soldPriceMinor !== null && (
              <tr className="sum"><td>Sold</td><td>{eur(item.soldPriceMinor, 2)} · profit {eur(item.actualProfitMinor ?? 0, 2)}{item.actualRoiPct !== null ? ` · ROI ${Math.round(item.actualRoiPct)}%` : ''}{item.daysToSell !== null ? ` · ${item.daysToSell} d` : ''}</td></tr>
            )}
          </tbody>
        </table>

        {mode === 'view' && (
          <>
            <div className="sheet-actions">
              {isActive(item.status) && item.status !== 'listed' && <button type="button" className="ghost" onClick={() => setMode('list')}>Mark as listed</button>}
              {isActive(item.status) && <button type="button" className="primary" onClick={() => setMode('sell')}>Mark as sold</button>}
              {onCreateListing && isActive(item.status) && <button type="button" className="ghost" onClick={() => onCreateListing(item)}>Write listing</button>}
            </div>
            <div className="sheet-minor">
              {item.status === 'bought' && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'ready_to_list' }, 'item_status_changed')}>Ready to list</button>}
              {isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'returned' }, 'item_status_changed')}>Returned</button>}
              {isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'discarded' }, 'item_status_changed')}>Discarded</button>}
              {!isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'bought', soldPrice: null, soldAt: null, saleFees: null, saleShipping: null }, 'item_status_changed')}>Back to stock</button>}
              <button
                type="button"
                className="link danger-link"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Delete this item?')) void api.deleteInventory(item.id).then(onDeleted);
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}

        {mode === 'list' && (
          <div className="form-card">
            <label className="field"><span>Listed on</span><input value={listedOn} onChange={(e) => setListedOn(e.target.value)} /></label>
            <label className="field"><span>Listing price</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={listedPrice} onChange={(e) => setListedPrice(e.target.value)} /></div></label>
            <div className="sheet-actions">
              <button type="button" className="ghost" onClick={() => setMode('view')}>Cancel</button>
              <button type="button" className="primary" disabled={busy} onClick={() => void patch({ status: 'listed', listedOn, ...(listedPrice && { listedPrice: num(listedPrice) }) }, 'item_status_changed')}>Save</button>
            </div>
          </div>
        )}

        {mode === 'sell' && (
          <div className="form-card">
            <label className="field"><span>Sold for (what the buyer paid, incl. shipping)</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} autoFocus /></div></label>
            <div className="row2">
              <label className="field"><span>Fees</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={fees} placeholder={suggestFees(num(soldPrice) || 0).toFixed(2)} onChange={(e) => setFees(e.target.value)} /></div></label>
              <label className="field"><span>Shipping you paid</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></div></label>
            </div>
            <p className={`sale-preview ${profitPreview >= 0 ? 'pos' : 'neg'}`}>Profit {profitPreview >= 0 ? '+' : '−'}€{Math.abs(profitPreview).toFixed(2)}</p>
            <div className="sheet-actions">
              <button type="button" className="ghost" onClick={() => setMode('view')}>Cancel</button>
              <button
                type="button"
                className="primary"
                disabled={busy || !(num(soldPrice) > 0)}
                onClick={() => void patch({ status: 'sold', soldPrice: num(soldPrice), saleFees: feesValue, saleShipping: num(ship) || 0 }, 'item_sold')}
              >
                Save sale
              </button>
            </div>
          </div>
        )}
        {error && <div className="banner bad">{error}</div>}
      </div>
    </div>
  );
}
