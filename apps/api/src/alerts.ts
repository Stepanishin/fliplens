import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import webpush from 'web-push';
import {
  CONDITIONS,
  estimatePrice,
  FEE_PRESETS,
  marketFor,
  type Condition,
  type CurrencyCode,
  type ExclusionReason,
  type FeePresetId,
  type NormalizedProduct,
  type PlanId,
} from '@fliplens/core';
import type { EbayAdapter, EcbFxService } from '@fliplens/sources';
import {
  claimDueWatches,
  countWatches,
  createWatch,
  deletePushSubscription,
  deleteWatch,
  listWatches,
  markWatchChecked,
  pushSubscriptionsOf,
  savePushSubscription,
  type Db,
  type WatchRow,
} from '@fliplens/db';

/**
 * Price alerts (ADR-031): "tell me when this is listed for at most X". A job claims due watches every few minutes,
 * searches eBay for the newest listings (the same market data as the check), keeps the ones that match the product and
 * the condition and cost at most X including shipping, and sends a web push for those not seen before.
 * Prices always come from real listings; nothing is estimated here.
 */

export interface AlertsConfig {
  publicKey: string;
  privateKey: string;
  /** mailto: or https: contact for push services. */
  subject: string;
}

export function alertsConfigFromEnv(env: NodeJS.ProcessEnv): AlertsConfig | undefined {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return undefined;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT?.trim() || 'https://fliplens.eu' };
}

/** Watches per plan. */
export const WATCH_LIMIT: Readonly<Record<PlanId, number>> = { free: 3, pro: 25, reseller: 100 };
/** How often one watch is searched. */
const CHECK_EVERY_MS = Number(process.env.ALERT_CHECK_EVERY_MIN || 180) * 60_000;
const TICK_MS = Number(process.env.ALERT_TICK_MIN || 10) * 60_000;
const PER_TICK = 20;
const SEEN_CAP = 300;
/** Not structural mismatches: a deal is often a low outlier, or a better condition than asked for. */
const ACCEPTED: ReadonlySet<ExclusionReason | undefined> = new Set([undefined, 'outlier_low', 'outlier_high', 'seller_cap', 'duplicate', 'stale']);

export interface Deal {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  priceMinor: number;
  currency: CurrencyCode;
  site: string;
  condition: string | null;
}

interface Deps {
  db: Db;
  cfg: AlertsConfig;
  ebay: EbayAdapter;
  fx: EcbFxService;
  requireSignedIn: (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined>;
  planOf: (uid: string) => Promise<PlanId>;
  ownScan: (req: FastifyRequest, scanId: string) => Promise<{ product: NormalizedProduct; condition: string; currency: string } | undefined>;
}

/** Listings for the watch at or below its price, cheapest first. */
async function findDeals(d: Pick<Deps, 'ebay' | 'fx'>, w: Pick<WatchRow, 'product' | 'condition' | 'country' | 'preset' | 'currency' | 'maxPriceMinor'>, fresh: boolean): Promise<Deal[]> {
  const product = w.product as NormalizedProduct;
  const market = marketFor(w.country, w.preset as FeePresetId);
  const condition = (CONDITIONS as readonly string[]).includes(w.condition) ? (w.condition as Condition) : 'good';
  const [search, rates] = await Promise.all([
    d.ebay.searchProduct(product, { ...(market.sites && { sites: market.sites }), ...(fresh && { maxAgeMs: 30 * 60_000, sort: 'newest' as const }) }),
    d.fx.latest(),
  ]);
  const est = estimatePrice({ product, targetCondition: condition, items: search.items, targetCurrency: w.currency as CurrencyCode, fx: rates, now: new Date(), identificationConfidence: 1 });
  const want = CONDITIONS.indexOf(condition);
  // Far below the going price is almost always a part, a box or a scam, not a deal.
  const floor = est.status === 'ok' ? Math.round(est.distribution.median * 0.5) : 0;
  return est.comparables
    .filter((c) => {
      if (!c.priceTarget || c.priceTarget.amountMinor > w.maxPriceMinor || c.priceTarget.amountMinor < floor) return false;
      if (c.role !== 'comparable') return false;
      if (ACCEPTED.has(c.exclusionReason)) return true;
      // A better condition than asked for is a deal too.
      return c.exclusionReason === 'condition_mismatch' && c.item.condition !== undefined && CONDITIONS.indexOf(c.item.condition) <= want;
    })
    .sort((a, b) => a.priceTarget!.amountMinor - b.priceTarget!.amountMinor)
    .map((c) => ({
      id: c.item.externalId,
      title: c.item.title,
      url: c.item.url,
      imageUrl: c.item.imageUrl ?? null,
      priceMinor: c.priceTarget!.amountMinor,
      currency: c.priceTarget!.currency,
      site: c.item.marketplaceSite,
      condition: c.item.condition ?? null,
    }));
}

const SITE_NAME: Record<string, string> = { EBAY_DE: 'eBay.de', EBAY_FR: 'eBay.fr', EBAY_IT: 'eBay.it', EBAY_ES: 'eBay.es', EBAY_NL: 'eBay.nl', EBAY_GB: 'eBay.co.uk' };
const fmt = (minor: number, c: CurrencyCode) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);

/** Sends to every device of the user; drops subscriptions the push service says are gone. */
async function push(d: Pick<Deps, 'db' | 'cfg'>, userId: string, payload: { title: string; body: string; url: string; tag?: string }, log: FastifyBaseLogger): Promise<number> {
  const subs = await pushSubscriptionsOf(d.db, userId);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { vapidDetails: { subject: d.cfg.subject, publicKey: d.cfg.publicKey, privateKey: d.cfg.privateKey }, TTL: 6 * 3600 },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await deletePushSubscription(d.db, s.endpoint);
      else log.warn({ event: 'push_failed', status: code ?? null }, e instanceof Error ? e.message : String(e));
    }
  }
  return sent;
}

const productName = (p: NormalizedProduct) => [p.brand, p.model, p.capacity].filter(Boolean).join(' ');

const WatchBody = z.object({
  scanId: z.string().uuid(),
  maxPrice: z.number().positive().max(100_000),
  country: z.string().regex(/^[A-Z]{2}$/),
  preset: z.string().max(40),
});
const SubBody = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }) });

export function registerAlertRoutes(app: FastifyInstance, d: Deps): void {
  app.get('/api/alerts/config', async () => ({ publicKey: d.cfg.publicKey }));

  app.post('/api/push/subscribe', async (req, reply) => {
    const uid = await d.requireSignedIn(req, reply);
    if (!uid) return reply;
    const b = SubBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'invalid_request' });
    await savePushSubscription(d.db, uid, { endpoint: b.data.endpoint, p256dh: b.data.keys.p256dh, auth: b.data.keys.auth });
    return { ok: true };
  });

  app.post('/api/push/test', async (req, reply) => {
    const uid = await d.requireSignedIn(req, reply);
    if (!uid) return reply;
    const sent = await push(d, uid, { title: 'FlipLens', body: 'Price alerts are on. We will tell you when a deal shows up.', url: '/' }, req.log);
    return { sent };
  });

  app.get('/api/watches', async (req, reply) => {
    const uid = await d.requireSignedIn(req, reply);
    if (!uid) return reply;
    const [rows, plan] = await Promise.all([listWatches(d.db, uid), d.planOf(uid)]);
    return {
      limit: WATCH_LIMIT[plan],
      watches: rows.map((w) => ({
        id: w.id,
        name: productName(w.product as NormalizedProduct),
        condition: w.condition,
        maxPriceMinor: w.maxPriceMinor,
        currency: w.currency,
        alerts: w.alerts,
        lastCheckedAt: w.lastCheckedAt?.toISOString() ?? null,
        lastAlertAt: w.lastAlertAt?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  });

  app.post('/api/watches', async (req, reply) => {
    const uid = await d.requireSignedIn(req, reply);
    if (!uid) return reply;
    const b = WatchBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(b.data.preset in FEE_PRESETS)) return reply.code(400).send({ error: 'invalid_request' });
    const scan = await d.ownScan(req, b.data.scanId);
    if (!scan) return reply.code(404).send({ error: 'not_found' });
    const [n, plan] = await Promise.all([countWatches(d.db, uid), d.planOf(uid)]);
    if (n >= WATCH_LIMIT[plan]) {
      return reply.code(402).send({ error: 'watch_limit', message: `Your plan has ${WATCH_LIMIT[plan]} price alerts. Remove one or upgrade.`, limit: WATCH_LIMIT[plan] });
    }
    const market = marketFor(b.data.country, b.data.preset as FeePresetId);
    const w = {
      userId: uid,
      product: scan.product,
      condition: scan.condition,
      country: b.data.country,
      preset: b.data.preset,
      currency: market.currency,
      maxPriceMinor: Math.round(b.data.maxPrice * 100),
    };
    // What is already out there now: shown right away and not alerted again later.
    const now = await findDeals(d, w, false).catch(() => [] as Deal[]);
    const row = await createWatch(d.db, { ...w, seenItemIds: now.map((x) => x.id).slice(0, SEEN_CAP), lastCheckedAt: new Date() });
    req.log.info({ event: 'watch_created', category: scan.product.category, current: now.length }, 'price alert');
    return { id: row.id, current: now.slice(0, 5) };
  });

  app.delete('/api/watches/:id', async (req, reply) => {
    const uid = await d.requireSignedIn(req, reply);
    if (!uid) return reply;
    const id = (req.params as { id: string }).id;
    if (!/^[0-9a-f-]{36}$/.test(id)) return reply.code(400).send({ error: 'invalid_request' });
    return (await deleteWatch(d.db, uid, id)) ? { ok: true } : reply.code(404).send({ error: 'not_found' });
  });
}

/** The background job. Several instances may run it: each claims different watches. */
export function startAlertWorker(d: Pick<Deps, 'db' | 'cfg' | 'ebay' | 'fx'>, log: FastifyBaseLogger): () => void {
  let busy = false;
  const tick = async () => {
    if (busy || !d.ebay.isConfigured()) return;
    busy = true;
    try {
      const due = await claimDueWatches(d.db, CHECK_EVERY_MS, PER_TICK);
      let alerts = 0;
      for (const w of due) {
        try {
          const deals = await findDeals(d, w, true);
          const seen = new Set(w.seenItemIds);
          const fresh = deals.filter((x) => !seen.has(x.id));
          if (fresh.length > 0) {
            const best = fresh[0]!;
            const name = productName(w.product as NormalizedProduct);
            const more = fresh.length > 1 ? ` (+${fresh.length - 1} more)` : '';
            await push(d, w.userId, {
              title: `${name}: ${fmt(best.priceMinor, best.currency)}`,
              body: `${SITE_NAME[best.site] ?? best.site} · at or below your ${fmt(w.maxPriceMinor, w.currency as CurrencyCode)}${more}. Tap to open.`,
              url: best.url,
              tag: `watch-${w.id}`,
            }, log);
            alerts++;
          }
          const ids = [...fresh.map((x) => x.id), ...w.seenItemIds].slice(0, SEEN_CAP);
          await markWatchChecked(d.db, w.id, { seenItemIds: ids, alerted: fresh.length > 0 ? 1 : 0 });
        } catch (e) {
          log.warn({ event: 'watch_check_failed', watch: w.id }, e instanceof Error ? e.message : String(e));
        }
      }
      if (due.length > 0) log.info({ event: 'alerts_tick', checked: due.length, alerts }, 'price alerts');
    } catch (e) {
      log.error({ event: 'alerts_tick_failed' }, e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  };
  const first = setTimeout(() => void tick(), 60_000);
  const timer = setInterval(() => void tick(), TICK_MS);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
