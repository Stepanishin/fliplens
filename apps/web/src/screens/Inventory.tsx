import { useEffect, useState } from 'react';
import { FEE_PRESETS } from '@fliplens/core';
import { api, type InventoryItem, type InventoryStatus, type InventorySummary } from '../api.js';
import { ago, date, errorText, money as eur, tr } from '../i18n.js';
import type { Settings } from '../storage.js';
import { track } from '../track.js';

const T = tr({
  en: {
    status: { bought: 'Bought', ready_to_list: 'Ready to list', listed: 'Listed', sold: 'Sold', returned: 'Returned', discarded: 'Discarded' } as Record<InventoryStatus, string>,
    filter: { active: 'In stock', listed: 'Listed', sold: 'Sold', returned: 'Returned', discarded: 'Discarded' } as Record<string, string>,
    loadFailed: 'Could not load stock',
    saveFailed: 'Could not save',
    title: 'Stock',
    inStock: 'In stock',
    invested: (v: string) => `invested ${v}`,
    expectedProfit: 'Expected profit',
    revenue: (v: string) => `revenue ${v}`,
    realisedProfit: 'Realised profit',
    soldCount: (n: number) => `${n} sold`,
    daysToSell: (n: number) => ` · ~${n} d to sell`,
    accuracy: 'Estimate accuracy',
    na: 'n/a',
    accuracyNote: 'real sale vs. our estimate',
    emptyAll: 'Nothing here yet. After a check, tap "I bought it" to track the item until it sells.',
    emptyList: 'No items in this list.',
    soldFor: (v: string) => ` → sold ${v}`,
    exp: ' exp.',
    boughtRow: 'Bought',
    estimateAtPurchase: 'Estimate at purchase',
    profitParen: (v: string) => `(profit ${v})`,
    listedRow: 'Listed',
    listedOnText: (price: string, where: string) => `${price} on ${where}`,
    soldRow: 'Sold',
    profit: (v: string) => `profit ${v}`,
    days: (n: number) => `${n} d`,
    markListed: 'Mark as listed',
    markSold: 'Mark as sold',
    writeListing: 'Write listing',
    readyToList: 'Ready to list',
    returned: 'Returned',
    discarded: 'Discarded',
    backToStock: 'Back to stock',
    confirmDelete: 'Delete this item?',
    del: 'Delete',
    listedOn: 'Listed on',
    listingPrice: 'Listing price',
    cancel: 'Cancel',
    save: 'Save',
    soldForLabel: 'Sold for (what the buyer paid, incl. shipping)',
    fees: 'Fees',
    shippingPaid: 'Shipping you paid',
    profitPreview: 'Profit',
    saveSale: 'Save sale',
  },
  de: {
    status: { bought: 'Gekauft', ready_to_list: 'Bereit zum Einstellen', listed: 'Eingestellt', sold: 'Verkauft', returned: 'Zurückgegeben', discarded: 'Aussortiert' } as Record<InventoryStatus, string>,
    filter: { active: 'Im Lager', listed: 'Eingestellt', sold: 'Verkauft', returned: 'Zurückgegeben', discarded: 'Aussortiert' } as Record<string, string>,
    loadFailed: 'Lager konnte nicht geladen werden',
    saveFailed: 'Speichern fehlgeschlagen',
    title: 'Lager',
    inStock: 'Im Lager',
    invested: (v: string) => `investiert ${v}`,
    expectedProfit: 'Erwarteter Gewinn',
    revenue: (v: string) => `Umsatz ${v}`,
    realisedProfit: 'Realisierter Gewinn',
    soldCount: (n: number) => `${n} verkauft`,
    daysToSell: (n: number) => ` · ~${n} T. bis Verkauf`,
    accuracy: 'Genauigkeit der Schätzung',
    na: 'n. v.',
    accuracyNote: 'echter Verkauf vs. unsere Schätzung',
    emptyAll: 'Noch nichts hier. Hast du nach einem Check etwas gekauft? Leg es im Ergebnis ins Lager und verfolge es bis zum Verkauf.',
    emptyList: 'Keine Artikel in dieser Liste.',
    soldFor: (v: string) => ` → verkauft für ${v}`,
    exp: ' erw.',
    boughtRow: 'Gekauft',
    estimateAtPurchase: 'Schätzung beim Kauf',
    profitParen: (v: string) => `(Gewinn ${v})`,
    listedRow: 'Eingestellt',
    listedOnText: (price: string, where: string) => `${price} auf ${where}`,
    soldRow: 'Verkauft',
    profit: (v: string) => `Gewinn ${v}`,
    days: (n: number) => `${n} T.`,
    markListed: 'Als eingestellt markieren',
    markSold: 'Als verkauft markieren',
    writeListing: 'Anzeige schreiben',
    readyToList: 'Bereit zum Einstellen',
    returned: 'Zurückgegeben',
    discarded: 'Aussortiert',
    backToStock: 'Zurück ins Lager',
    confirmDelete: 'Diesen Artikel löschen?',
    del: 'Löschen',
    listedOn: 'Eingestellt auf',
    listingPrice: 'Angebotspreis',
    cancel: 'Abbrechen',
    save: 'Speichern',
    soldForLabel: 'Verkauft für (was der Käufer bezahlt hat, inkl. Versand)',
    fees: 'Gebühren',
    shippingPaid: 'Von dir bezahlter Versand',
    profitPreview: 'Gewinn',
    saveSale: 'Verkauf speichern',
  },
});

export const STATUS_LABEL: Record<InventoryStatus, string> = T.status;
const FILTERS: readonly ('active' | InventoryStatus)[] = ['active', 'listed', 'sold', 'returned', 'discarded'];
const FILTER_LABEL: Record<string, string> = T.filter;
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

  const load = () => api.inventory().then(setData, (e: unknown) => setError(errorText(e, T.loadFailed)));
  useEffect(() => {
    void load();
  }, []);

  if (error) return <div className="screen"><div className="banner bad">{error}</div></div>;
  if (!data) return <div className="screen"><h1 className="screen-title">{T.title}</h1><div className="skeleton-list"><div className="skeleton tall" /><div className="skeleton" /></div></div>;

  const { summary: s } = data;
  const shown = data.items.filter((i) => (filter === 'active' ? isActive(i.status) : i.status === filter));

  return (
    <div className="screen">
      <h1 className="screen-title">{T.title}</h1>

      <div className="stock-summary">
        <div className="stat-card">
          <span>{T.inStock}</span>
          <strong>{s.active.items}</strong>
          <small>{T.invested(eur(s.active.investedMinor))}</small>
        </div>
        <div className="stat-card">
          <span>{T.expectedProfit}</span>
          <strong className={s.active.expectedProfitMinor >= 0 ? 'pos' : 'neg'}>{eur(s.active.expectedProfitMinor)}</strong>
          <small>{T.revenue(eur(s.active.expectedRevenueMinor))}</small>
        </div>
        <div className="stat-card">
          <span>{T.realisedProfit}</span>
          <strong className={s.sold.profitMinor >= 0 ? 'pos' : 'neg'}>{eur(s.sold.profitMinor)}</strong>
          <small>{T.soldCount(s.sold.items)}{s.sold.avgDaysToSell !== null ? T.daysToSell(s.sold.avgDaysToSell) : ''}</small>
        </div>
        <div className="stat-card">
          <span>{T.accuracy}</span>
          <strong>{s.sold.avgPredictionErrorPct === null ? T.na : `±${s.sold.avgPredictionErrorPct}%`}</strong>
          <small>{T.accuracyNote}</small>
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
          {data.items.length === 0 ? T.emptyAll : T.emptyList}
        </div>
      ) : (
        <ul className="recent">
          {shown.map((i) => (
            <li key={i.id}>
              <button type="button" className={`recent-row st-${i.status}`} onClick={() => setOpen(i)}>
                <span className="recent-main">
                  <strong>{i.brand} {i.model}{i.capacity ? ` ${i.capacity}` : ''}</strong>
                  <span className="muted small">
                    {eur(i.purchasePriceMinor, i.purchasePriceMinor % 100 ? 2 : 0)}
                    {i.status === 'sold' && i.soldPriceMinor !== null ? T.soldFor(eur(i.soldPriceMinor, i.soldPriceMinor % 100 ? 2 : 0)) : i.expectedSaleMinor ? ` → ~${eur(i.expectedSaleMinor)}` : ''}
                    {' · '}{ago(i.status === 'sold' && i.soldAt ? i.soldAt : i.purchasedAt)}
                  </span>
                </span>
                <span className="recent-side">
                  <span className="pill soft">{STATUS_LABEL[i.status]}</span>
                  {(i.actualProfitMinor ?? i.expectedProfitMinor) !== null && (
                    <span className={`recent-profit ${(i.actualProfitMinor ?? i.expectedProfitMinor)! >= 0 ? 'pos' : 'neg'}`}>
                      {(i.actualProfitMinor ?? i.expectedProfitMinor)! >= 0 ? '+' : '−'}{eur(Math.abs((i.actualProfitMinor ?? i.expectedProfitMinor)!))}
                      {i.actualProfitMinor === null ? T.exp : ''}
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
      setError(errorText(e, T.saveFailed));
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
            <tr><td>{T.boughtRow}</td><td>{eur(item.purchasePriceMinor, 2)} · {date(item.purchasedAt, { day: 'numeric', month: 'numeric', year: 'numeric' })}{item.source ? ` · ${item.source}` : ''}</td></tr>
            {item.expectedSaleMinor !== null && <tr><td>{T.estimateAtPurchase}</td><td>{eur(item.expectedSaleMinor)} {T.profitParen(eur(item.expectedProfitMinor ?? 0))}</td></tr>}
            {item.listedPriceMinor !== null && <tr><td>{T.listedRow}</td><td>{T.listedOnText(eur(item.listedPriceMinor), item.listedOn ?? '')}</td></tr>}
            {item.soldPriceMinor !== null && (
              <tr className="sum"><td>{T.soldRow}</td><td>{eur(item.soldPriceMinor, 2)} · {T.profit(eur(item.actualProfitMinor ?? 0, 2))}{item.actualRoiPct !== null ? ` · ROI ${Math.round(item.actualRoiPct)}%` : ''}{item.daysToSell !== null ? ` · ${T.days(item.daysToSell)}` : ''}</td></tr>
            )}
          </tbody>
        </table>

        {mode === 'view' && (
          <>
            <div className="sheet-actions">
              {isActive(item.status) && item.status !== 'listed' && <button type="button" className="ghost" onClick={() => setMode('list')}>{T.markListed}</button>}
              {isActive(item.status) && <button type="button" className="primary" onClick={() => setMode('sell')}>{T.markSold}</button>}
              {onCreateListing && isActive(item.status) && <button type="button" className="ghost" onClick={() => onCreateListing(item)}>{T.writeListing}</button>}
            </div>
            <div className="sheet-minor">
              {item.status === 'bought' && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'ready_to_list' }, 'item_status_changed')}>{T.readyToList}</button>}
              {isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'returned' }, 'item_status_changed')}>{T.returned}</button>}
              {isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'discarded' }, 'item_status_changed')}>{T.discarded}</button>}
              {!isActive(item.status) && <button type="button" className="link" disabled={busy} onClick={() => void patch({ status: 'bought', soldPrice: null, soldAt: null, saleFees: null, saleShipping: null }, 'item_status_changed')}>{T.backToStock}</button>}
              <button
                type="button"
                className="link danger-link"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(T.confirmDelete)) void api.deleteInventory(item.id).then(onDeleted);
                }}
              >
                {T.del}
              </button>
            </div>
          </>
        )}

        {mode === 'list' && (
          <div className="form-card">
            <label className="field"><span>{T.listedOn}</span><input value={listedOn} onChange={(e) => setListedOn(e.target.value)} /></label>
            <label className="field"><span>{T.listingPrice}</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={listedPrice} onChange={(e) => setListedPrice(e.target.value)} /></div></label>
            <div className="sheet-actions">
              <button type="button" className="ghost" onClick={() => setMode('view')}>{T.cancel}</button>
              <button type="button" className="primary" disabled={busy} onClick={() => void patch({ status: 'listed', listedOn, ...(listedPrice && { listedPrice: num(listedPrice) }) }, 'item_status_changed')}>{T.save}</button>
            </div>
          </div>
        )}

        {mode === 'sell' && (
          <div className="form-card">
            <label className="field"><span>{T.soldForLabel}</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} autoFocus /></div></label>
            <div className="row2">
              <label className="field"><span>{T.fees}</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={fees} placeholder={suggestFees(num(soldPrice) || 0).toFixed(2)} onChange={(e) => setFees(e.target.value)} /></div></label>
              <label className="field"><span>{T.shippingPaid}</span><div className="input-affix"><span>€</span><input inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></div></label>
            </div>
            <p className={`sale-preview ${profitPreview >= 0 ? 'pos' : 'neg'}`}>{T.profitPreview} {profitPreview >= 0 ? '+' : '−'}{eur(Math.round(Math.abs(profitPreview) * 100), 2)}</p>
            <div className="sheet-actions">
              <button type="button" className="ghost" onClick={() => setMode('view')}>{T.cancel}</button>
              <button
                type="button"
                className="primary"
                disabled={busy || !(num(soldPrice) > 0)}
                onClick={() => void patch({ status: 'sold', soldPrice: num(soldPrice), saleFees: feesValue, saleShipping: num(ship) || 0 }, 'item_sold')}
              >
                {T.saveSale}
              </button>
            </div>
          </div>
        )}
        {error && <div className="banner bad">{error}</div>}
      </div>
    </div>
  );
}
