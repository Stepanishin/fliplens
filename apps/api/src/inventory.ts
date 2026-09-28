import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CATEGORIES, CONDITIONS } from '@fliplens/core';
import {
  addInventory,
  deleteInventory,
  listInventory,
  scanForInventory,
  updateInventory,
  type Db,
  type InventoryPatch,
  type InventoryRow,
} from '@fliplens/db';

/** Inventory (spec Phase 8) and actual sales (Phase 10). Amounts in the API are euros; stored as cents. */

const STATUSES = ['bought', 'ready_to_list', 'listed', 'sold', 'returned', 'discarded'] as const;
const ACTIVE = new Set(['bought', 'ready_to_list', 'listed']);
const euros = z.number().min(0).max(1_000_000);
const cents = (v: number | undefined | null): number | null | undefined => (v === undefined ? undefined : v === null ? null : Math.round(v * 100));

const AddBody = z.object({
  scanId: z.string().uuid().optional(),
  category: z.enum(CATEGORIES).optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  model: z.string().trim().min(1).max(200).optional(),
  capacity: z.string().trim().max(40).optional(),
  condition: z.enum(CONDITIONS).optional(),
  purchasePrice: euros,
  purchasedAt: z.string().datetime().optional(),
  source: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const PatchBody = z.object({
  status: z.enum(STATUSES).optional(),
  purchasePrice: euros.optional(),
  source: z.string().trim().max(120).nullable().optional(),
  listedOn: z.string().trim().max(60).nullable().optional(),
  listedPrice: euros.nullable().optional(),
  soldPrice: euros.nullable().optional(),
  saleFees: euros.nullable().optional(),
  saleShipping: euros.nullable().optional(),
  soldAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

function actualProfitMinor(i: InventoryRow): number | null {
  if (i.soldPriceMinor === null) return null;
  return i.soldPriceMinor - (i.saleFeesMinor ?? 0) - (i.saleShippingMinor ?? 0) - i.purchasePriceMinor;
}

function toJson(i: InventoryRow) {
  const profit = actualProfitMinor(i);
  const daysToSell = i.soldAt ? Math.max(0, Math.round((i.soldAt.getTime() - i.purchasedAt.getTime()) / 86_400_000)) : null;
  return {
    id: i.id,
    scanId: i.scanId,
    category: i.category,
    brand: i.brand,
    model: i.model,
    capacity: i.capacity,
    condition: i.condition,
    purchasePriceMinor: i.purchasePriceMinor,
    purchasedAt: i.purchasedAt.toISOString(),
    source: i.source,
    expectedSaleMinor: i.expectedSaleMinor,
    expectedProfitMinor: i.expectedProfitMinor,
    status: i.status,
    listedOn: i.listedOn,
    listedPriceMinor: i.listedPriceMinor,
    listedAt: i.listedAt?.toISOString() ?? null,
    soldPriceMinor: i.soldPriceMinor,
    saleFeesMinor: i.saleFeesMinor,
    saleShippingMinor: i.saleShippingMinor,
    soldAt: i.soldAt?.toISOString() ?? null,
    notes: i.notes,
    actualProfitMinor: profit,
    actualRoiPct: profit !== null && i.purchasePriceMinor > 0 ? Math.round((profit / i.purchasePriceMinor) * 1000) / 10 : null,
    daysToSell,
  };
}

export function summarize(items: readonly InventoryRow[]) {
  const active = items.filter((i) => ACTIVE.has(i.status));
  const sold = items.filter((i) => i.status === 'sold' && i.soldPriceMinor !== null);
  const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
  const days = sold.filter((i) => i.soldAt).map((i) => (i.soldAt!.getTime() - i.purchasedAt.getTime()) / 86_400_000);
  const withPrediction = sold.filter((i) => i.expectedSaleMinor);
  return {
    counts: Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])),
    active: {
      items: active.length,
      investedMinor: sum(active.map((i) => i.purchasePriceMinor)),
      expectedRevenueMinor: sum(active.map((i) => i.expectedSaleMinor ?? 0)),
      expectedProfitMinor: sum(active.map((i) => i.expectedProfitMinor ?? 0)),
    },
    sold: {
      items: sold.length,
      revenueMinor: sum(sold.map((i) => i.soldPriceMinor!)),
      profitMinor: sum(sold.map((i) => actualProfitMinor(i)!)),
      avgDaysToSell: days.length ? Math.round(sum(days) / days.length) : null,
      /** How far real sale prices were from our estimate: the honest accuracy number. */
      avgPredictionErrorPct: withPrediction.length
        ? Math.round(sum(withPrediction.map((i) => Math.abs(i.soldPriceMinor! - i.expectedSaleMinor!) / i.expectedSaleMinor!)) / withPrediction.length * 100)
        : null,
    },
  };
}

export function registerInventoryRoutes(
  app: FastifyInstance,
  db: Db,
  requireSignedIn: (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined>,
): void {
  app.get('/api/inventory', async (req, reply) => {
    const uid = await requireSignedIn(req, reply);
    if (!uid) return;
    const items = await listInventory(db, uid);
    return { items: items.map(toJson), summary: summarize(items) };
  });

  app.post('/api/inventory', async (req, reply) => {
    const uid = await requireSignedIn(req, reply);
    if (!uid) return;
    const parsed = AddBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues.map((i) => i.message) });
    const b = parsed.data;
    // From a check: identity and the estimate at purchase time come from the stored scan, not from the client.
    const fromScan = b.scanId ? await scanForInventory(db, uid, b.scanId) : undefined;
    if (b.scanId && !fromScan) return reply.code(404).send({ error: 'scan_not_found' });
    const brand = fromScan?.scan.brand ?? b.brand;
    const model = fromScan?.scan.model ?? b.model;
    if (!brand || !model) return reply.code(400).send({ error: 'invalid_request', message: 'brand and model required' });
    const purchase = Math.round(b.purchasePrice * 100);
    const expectedSale = fromScan?.valuation?.expectedSaleMinor ?? null;
    const expectedNet = fromScan?.valuation?.expectedNetMinor ?? null;
    const item = await addInventory(db, uid, {
      ...(b.scanId && { scanId: b.scanId }),
      category: fromScan?.scan.category ?? b.category ?? 'other',
      brand,
      model,
      capacity: fromScan?.scan.capacity ?? b.capacity ?? null,
      condition: fromScan?.scan.condition ?? b.condition ?? 'good',
      purchasePriceMinor: purchase,
      ...(b.purchasedAt && { purchasedAt: new Date(b.purchasedAt) }),
      source: b.source ?? null,
      notes: b.notes ?? null,
      expectedSaleMinor: expectedSale,
      // Profit re-based on the price actually paid (it may differ from the price checked).
      expectedProfitMinor: expectedNet !== null ? expectedNet - purchase : null,
    });
    req.log.info({ event: 'inventory_added', fromScan: Boolean(b.scanId) }, 'inventory item added');
    return toJson(item);
  });

  app.patch('/api/inventory/:id', async (req, reply) => {
    const uid = await requireSignedIn(req, reply);
    if (!uid) return;
    const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
    const parsed = PatchBody.safeParse(req.body);
    if (!id.success || !parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    const b = parsed.data;
    const patch: InventoryPatch = {
      ...(b.status && { status: b.status }),
      ...(b.purchasePrice !== undefined && { purchasePriceMinor: Math.round(b.purchasePrice * 100) }),
      ...(b.source !== undefined && { source: b.source }),
      ...(b.listedOn !== undefined && { listedOn: b.listedOn }),
      ...(b.listedPrice !== undefined && { listedPriceMinor: cents(b.listedPrice) ?? null }),
      ...(b.soldPrice !== undefined && { soldPriceMinor: cents(b.soldPrice) ?? null }),
      ...(b.saleFees !== undefined && { saleFeesMinor: cents(b.saleFees) ?? null }),
      ...(b.saleShipping !== undefined && { saleShippingMinor: cents(b.saleShipping) ?? null }),
      ...(b.soldAt !== undefined && { soldAt: b.soldAt ? new Date(b.soldAt) : null }),
      ...(b.notes !== undefined && { notes: b.notes }),
      ...(b.status === 'listed' && { listedAt: new Date() }),
      ...(b.status === 'sold' && b.soldAt === undefined && { soldAt: new Date() }),
    };
    const row = await updateInventory(db, uid, id.data, patch);
    if (!row) return reply.code(404).send({ error: 'not_found' });
    if (b.status) req.log.info({ event: b.status === 'sold' ? 'item_sold' : 'item_status_changed', status: b.status }, 'inventory status');
    return toJson(row);
  });

  app.delete('/api/inventory/:id', async (req, reply) => {
    const uid = await requireSignedIn(req, reply);
    if (!uid) return;
    const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
    return (await deleteInventory(db, uid, id.data)) ? { deleted: true } : reply.code(404).send({ error: 'not_found' });
  });
}
