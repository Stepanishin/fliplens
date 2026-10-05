import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import {
  adminOverview,
  adminRecentChecks,
  adminSubscriptions,
  adminTraffic,
  adminUser,
  adminUsers,
  connect,
  deleteScan,
  deleteUserData,
  eventStats,
  exportUserData,
  findUserByDevice,
  getScan,
  getSettings,
  getUser,
  aiCostThisMonth,
  identificationsThisMonth,
  linkGoogle,
  unlinkDevice,
  recordEvents,
  saveSettings,
  listScans,
  recordIdentification as dbRecordIdentification,
  recordScan,
  runMigrations,
  touchUser,
  type Db,
  type NewValuation,
} from '@fliplens/db';
import { money, PLANS, type FxRateTable, type InsufficientData, type NormalizedProduct, type Valuation } from '@fliplens/core';
import type { IdentificationResult } from '@fliplens/recognition';
import type { SearchResult } from '@fliplens/sources';
import { verifyGoogleIdToken } from './google.js';
import { createBilling, type BillingConfig, type Quota } from './billing.js';
import { registerInventoryRoutes } from './inventory.js';
import { registerListingRoutes } from './listing.js';
import type { OpenAIListingWriter } from '@fliplens/recognition';

/**
 * Optional persistence: with DATABASE_URL the API stores scans, valuations, recognition results (+ user corrections)
 * and usage costs. Without it everything still works, just nothing is saved. Write failures are logged, never hidden,
 * but they do not fail the user's request.
 */

export type DbStatus = 'connected' | 'disabled' | 'error';

/** Random per-installation key sent by the app until real accounts exist. */
const DEVICE_HEADER = 'x-device-id';
const DEVICE_KEY = /^[A-Za-z0-9-]{16,64}$/;

export interface ValuationRecord {
  body: {
    inputMethod: 'photo' | 'barcode' | 'manual';
    identificationId?: string | undefined;
    chosenCandidateIndex?: number | undefined;
    gtin?: string | undefined;
    condition: string;
    purchasePrice: number;
    currency: string;
    recognitionModelVersion?: string | undefined;
  };
  product: NormalizedProduct;
  result: Valuation | InsufficientData;
  search: SearchResult;
  fx: FxRateTable;
  feeProfileId: string;
}

export interface Persistence {
  readonly status: DbStatus;
  registerRoutes(app: FastifyInstance): void;
  recordIdentification(
    req: FastifyRequest,
    x: { method: 'photo' | 'barcode'; gtin?: string; imageCount: number; result: IdentificationResult; provider: string; model: string },
  ): Promise<string | undefined>;
  recordValuation(req: FastifyRequest, x: ValuationRecord): Promise<string | undefined>;
  /** Plan usage for the caller; undefined when there is no database (no metering). */
  quota(req: FastifyRequest): Promise<Quota | undefined>;
  /**
   * Gate for paid-for work (recognition, valuation): the caller must be signed in, and recognition calls are capped
   * at IDENTIFY_FACTOR x the plan's monthly checks. Returns false after sending the error response.
   */
  requireAccount(req: FastifyRequest, reply: FastifyReply, kind: 'valuation' | 'identification'): Promise<boolean>;
  /** 'cheap' once the caller spent the plan's AI budget this month: recognition must not escalate. */
  aiMode(req: FastifyRequest): Promise<'full' | 'cheap'>;
  /** Signed-in admin (ADMIN_EMAILS). Returns false after sending the error response. */
  requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<boolean>;
}

/** Recognition calls allowed per plan check: a few photos or retries per item are normal. */
const IDENTIFY_FACTOR = 1.5;

const SettingsBody = z.object({
  country: z.string().regex(/^[A-Z]{2}$/),
  currency: z.string().regex(/^[A-Z]{3}$/).default('EUR'),
  feePreset: z.string().min(1).max(50),
  shippingCostMinor: z.number().int().min(0).max(100_000),
  targetRoiPct: z.number().int().min(0).max(1000),
});

/** Spec section 62. Anything else is rejected, and props are small scalars only (no free text, no PII). */
const EVENT_NAMES = [
  'scan_started', 'image_uploaded', 'barcode_scanned', 'product_detected', 'product_corrected',
  'valuation_started', 'valuation_completed', 'valuation_failed', 'comparables_opened', 'item_marked_bought',
  'subscription_viewed', 'subscription_started', 'inventory_added', 'item_sold', 'market_link_opened', 'signed_in', 'app_installed', 'app_install_prompt', 'whatif_used', 'confirm_skipped',
  'item_status_changed', 'listing_generated', 'listing_copied', 'visit', 'page_view',
] as const;
const EventsBody = z.object({
  events: z
    .array(
      z.object({
        name: z.enum(EVENT_NAMES),
        props: z.record(z.string().max(40), z.union([z.string().max(100), z.number(), z.boolean(), z.null()])).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export interface AuthConfig {
  googleClientId?: string | undefined;
  /** Lower-case emails of signed-in users who can see /admin and the stats endpoints. */
  adminEmails?: readonly string[];
  billing?: BillingConfig;
  listingWriter?: OpenAIListingWriter;
}

export async function initPersistence(url: string | undefined, log: FastifyBaseLogger, auth: AuthConfig = {}): Promise<Persistence> {
  if (!url) {
    log.warn({ event: 'db_disabled' }, 'DATABASE_URL not set: scans are not stored');
    return disabled('disabled');
  }
  try {
    const { db } = connect(url);
    await runMigrations(db);
    log.info({ event: 'db_connected' }, 'database connected, migrations applied');
    return enabled(db, log, auth);
  } catch (e) {
    log.error({ event: 'db_error', err: e instanceof Error ? e.message : String(e) }, 'database unavailable: scans are not stored');
    return disabled('error');
  }
}

function disabled(status: DbStatus): Persistence {
  const unavailable = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.code(503).send({ error: 'db_unavailable', message: 'Scan history needs DATABASE_URL on the server' });
  return {
    status,
    registerRoutes(app) {
      app.get('/api/scans', unavailable);
      app.delete('/api/scans/:id', unavailable);
      app.get('/api/scans/:id', unavailable);
      app.get('/api/me/settings', unavailable);
      app.put('/api/me/settings', unavailable);
      app.post('/api/events', async () => ({ stored: 0 }));
      app.get('/api/me/export', unavailable);
      app.delete('/api/me', unavailable);
      app.get('/api/admin/overview', unavailable);
      app.get('/api/admin/traffic', unavailable);
      app.get('/api/admin/users', unavailable);
      app.get('/api/admin/users/:id', unavailable);
      app.get('/api/inventory', unavailable);
      app.post('/api/inventory', unavailable);
      app.patch('/api/inventory/:id', unavailable);
      app.delete('/api/inventory/:id', unavailable);
      app.post('/api/listing', unavailable);
      app.get('/api/me', async () => ({ account: null, authAvailable: false, isAdmin: false }));
      app.post('/api/auth/google', unavailable);
      app.post('/api/auth/logout', unavailable);
      app.get('/api/billing', unavailable);
      app.post('/api/billing/checkout', unavailable);
      app.post('/api/billing/portal', unavailable);
    },
    recordIdentification: async () => undefined,
    recordValuation: async () => undefined,
    quota: async () => undefined,
    // Without a database there are no accounts: local development only.
    requireAccount: async () => true,
    aiMode: async () => 'full',
    requireAdmin: async () => true,
  };
}

function enabled(db: Db, log: FastifyBaseLogger, auth: AuthConfig): Persistence {
  const userCache = new Map<string, string>();

  async function userId(req: FastifyRequest): Promise<string | undefined> {
    const key = req.headers[DEVICE_HEADER];
    if (typeof key !== 'string' || !DEVICE_KEY.test(key)) return undefined;
    const cached = userCache.get(key);
    if (cached) return cached;
    const id = await touchUser(db, key);
    userCache.set(key, id);
    return id;
  }

  async function safely<T>(req: FastifyRequest, what: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      req.log.error({ event: 'persistence_failed', what, err: e instanceof Error ? e.message : String(e) }, 'could not store data');
      return undefined;
    }
  }

  const requireUser = async (req: FastifyRequest, reply: FastifyReply): Promise<string | undefined> => {
    const id = await userId(req);
    if (!id) void reply.code(400).send({ error: 'device_id_required', message: `Send a ${DEVICE_HEADER} header` });
    return id;
  };

  /** Signed-in users only: history, settings and billing belong to an account. */
  const requireSignedIn = async (req: FastifyRequest, reply: FastifyReply): Promise<string | undefined> => {
    const uid = await requireUser(req, reply);
    if (!uid) return undefined;
    const u = await getUser(db, uid);
    if (!u?.googleSub) {
      void reply.code(401).send({ error: 'sign_in_required', message: 'Sign in with Google to use FlipLens' });
      return undefined;
    }
    return uid;
  };

  const admins = new Set((auth.adminEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean));
  const isAdmin = (email: string | null | undefined): boolean => Boolean(email && admins.has(email.toLowerCase()));
  /** Internal business numbers: signed-in admins only (ADMIN_EMAILS). */
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
    const uid = await requireSignedIn(req, reply);
    if (!uid) return false;
    const u = await getUser(db, uid);
    if (!isAdmin(u?.email)) {
      void reply.code(403).send({ error: 'forbidden' });
      return false;
    }
    return true;
  };

  const billing = auth.billing ? createBilling(db, auth.billing, log) : undefined;

  return {
    status: 'connected',

    requireAdmin,

    async requireAccount(req, reply, kind) {
      const uid = await requireSignedIn(req, reply);
      if (!uid) return false;
      if (kind === 'identification' && billing) {
        const q = await billing.quota(uid);
        const used = await identificationsThisMonth(db, uid);
        if (used >= q.limit * IDENTIFY_FACTOR) {
          req.log.info({ event: 'identify_limit', plan: q.plan }, 'recognition limit reached');
          void reply.code(402).send({ error: 'identify_limit', message: `You reached this month's recognition limit of your ${q.plan} plan.`, quota: q });
          return false;
        }
        // Hard stop for AI spend (abuse, bugs): 2x the plan budget. Barcode and typing still work.
        if ((await aiCostThisMonth(db, uid)) >= PLANS[q.plan].aiBudgetMicroUsd * 2) {
          req.log.warn({ event: 'ai_budget_exhausted', plan: q.plan }, 'AI budget exhausted');
          void reply.code(402).send({ error: 'ai_budget', message: 'Photo recognition is paused for this month. You can still scan barcodes or type the item.', quota: q });
          return false;
        }
      }
      return true;
    },

    async aiMode(req) {
      if (!billing) return 'full';
      const uid = await userId(req);
      if (!uid) return 'full';
      const q = await billing.quota(uid);
      const spent = await aiCostThisMonth(db, uid);
      if (spent < PLANS[q.plan].aiBudgetMicroUsd) return 'full';
      req.log.info({ event: 'ai_cheap_mode', plan: q.plan, spentMicroUsd: spent }, 'AI budget reached: cheap model only');
      return 'cheap';
    },

    async quota(req) {
      if (!billing) return undefined;
      const uid = await userId(req);
      return uid ? billing.quota(uid) : undefined;
    },

    registerRoutes(app) {
      billing?.registerRoutes(app, { requireUser: requireSignedIn });
      registerInventoryRoutes(app, db, requireSignedIn);
      if (auth.listingWriter) {
        registerListingRoutes(app, { db, writer: auth.listingWriter, requireSignedIn, ...(billing && { quota: (uid: string) => billing.quota(uid) }) });
      }

      // ---------- account ----------
      app.get('/api/me', async (req, reply) => {
        const key = req.headers[DEVICE_HEADER];
        if (typeof key !== 'string' || !DEVICE_KEY.test(key)) return reply.code(400).send({ error: 'device_id_required' });
        // Read-only: visiting the start page must not create users.
        const uid = userCache.get(key) ?? (await findUserByDevice(db, key));
        const u = uid ? await getUser(db, uid) : undefined;
        return {
          authAvailable: Boolean(auth.googleClientId),
          account: u?.googleSub ? { email: u.email, name: u.name, picture: u.picture } : null,
          isAdmin: Boolean(u?.googleSub) && isAdmin(u?.email),
        };
      });

      app.post('/api/auth/google', async (req, reply) => {
        const key = req.headers[DEVICE_HEADER];
        if (typeof key !== 'string' || !DEVICE_KEY.test(key)) return reply.code(400).send({ error: 'device_id_required' });
        if (!auth.googleClientId) return reply.code(409).send({ error: 'auth_not_configured', message: 'GOOGLE_CLIENT_ID is not set' });
        const body = z.object({ credential: z.string().min(20).max(5000) }).safeParse(req.body);
        if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
        let profile;
        try {
          profile = await verifyGoogleIdToken(body.data.credential, auth.googleClientId);
        } catch (e) {
          req.log.warn({ event: 'google_login_rejected', err: e instanceof Error ? e.message : String(e) }, 'google login rejected');
          return reply.code(401).send({ error: 'invalid_google_token', message: 'Google sign-in could not be verified. Try again.' });
        }
        const u = await linkGoogle(db, key, profile);
        userCache.delete(key);
        req.log.info({ event: 'user_signed_in', provider: 'google' }, 'signed in');
        return { account: { email: u.email, name: u.name, picture: u.picture } };
      });

      app.post('/api/auth/logout', async (req, reply) => {
        const key = req.headers[DEVICE_HEADER];
        if (typeof key !== 'string' || !DEVICE_KEY.test(key)) return reply.code(400).send({ error: 'device_id_required' });
        await unlinkDevice(db, key);
        userCache.delete(key);
        return { signedOut: true };
      });

      app.get('/api/scans', async (req, reply) => {
        const uid = await requireSignedIn(req, reply);
        if (!uid) return;
        const rows = await listScans(db, uid, 50);
        return rows.map(({ scan, valuation: v }) => ({
          id: scan.id,
          createdAt: scan.createdAt.toISOString(),
          inputMethod: scan.inputMethod,
          product: { category: scan.category, brand: scan.brand, model: scan.model, capacity: scan.capacity, mount: scan.mount },
          excludeModels: (scan.product as NormalizedProduct).excludeModels ?? [],
          condition: scan.condition,
          purchasePrice: money(scan.purchasePriceMinor / 100, 'EUR'),
          status: scan.status,
          valuation: v && {
            expected: v.expectedSaleMinor,
            profit: v.expectedProfitMinor,
            roiPct: v.roiBp === null ? null : v.roiBp / 100,
            decision: v.decision,
            confidenceLevel: v.confidenceLevel,
            includedCount: v.includedCount,
            currency: v.currency,
            pricingAlgorithmVersion: v.pricingAlgorithmVersion,
          },
        }));
      });

      app.get('/api/scans/:id', async (req, reply) => {
        const uid = await requireSignedIn(req, reply);
        if (!uid) return;
        const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
        if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
        const row = await getScan(db, uid, id.data);
        if (!row) return reply.code(404).send({ error: 'not_found' });
        return { scan: { ...row.scan, createdAt: row.scan.createdAt.toISOString() }, valuation: row.valuation };
      });

      app.get('/api/me/settings', async (req, reply) => {
        const uid = await requireSignedIn(req, reply);
        if (!uid) return;
        return (await getSettings(db, uid)) ?? null;
      });
      app.put('/api/me/settings', async (req, reply) => {
        const uid = await requireSignedIn(req, reply);
        if (!uid) return;
        const parsed = SettingsBody.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues.map((i) => i.message) });
        return saveSettings(db, uid, parsed.data);
      });

      app.post('/api/events', async (req, reply) => {
        const parsed = EventsBody.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
        // Lookup only: anonymous visitors of the start page are counted by a pseudonymous hash, never turned into users.
        const key = req.headers[DEVICE_HEADER];
        const validKey = typeof key === 'string' && DEVICE_KEY.test(key) ? key : undefined;
        const uid = validKey ? (userCache.get(validKey) ?? (await findUserByDevice(db, validKey))) : undefined;
        const visitor = validKey ? createHash('sha256').update(`fliplens-visitor:${validKey}`).digest('hex').slice(0, 20) : undefined;
        await safely(req, 'events', () => recordEvents(db, uid, parsed.data.events.map((e) => ({ name: e.name, props: e.props ?? {} })), visitor));
        return { stored: parsed.data.events.length };
      });

      app.delete('/api/scans/:id', async (req, reply) => {
        const uid = await requireSignedIn(req, reply);
        if (!uid) return;
        const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
        if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
        return (await deleteScan(db, uid, id.data)) ? { deleted: true } : reply.code(404).send({ error: 'not_found' });
      });

      // GDPR: export and erase everything tied to this device.
      app.get('/api/me/export', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        void reply.header('content-disposition', 'attachment; filename="fliplens-export.json"');
        return exportUserData(db, uid);
      });
      app.delete('/api/me', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        // Stop billing first: deleting the account must never leave a running subscription behind.
        if (billing) {
          try {
            await billing.cancelForDeletion(uid);
          } catch (e) {
            req.log.error({ event: 'subscription_cancel_failed', err: e instanceof Error ? e.message : String(e) }, 'could not cancel subscription');
            return reply.code(502).send({ error: 'cancel_failed', message: 'Could not cancel your subscription. Nothing was deleted; please try again.' });
          }
        }
        await deleteUserData(db, uid);
        for (const [k, v] of userCache) if (v === uid) userCache.delete(k);
        log.info({ event: 'user_data_deleted' }, 'user data deleted');
        return { deleted: true };
      });

      app.get('/api/admin/overview', async (req, reply) => {
        if (!(await requireAdmin(req, reply))) return;
        const days = z.coerce.number().int().min(1).max(365).catch(30).parse((req.query as { days?: string }).days);
        const [overview, events, recentChecks, subs] = await Promise.all([adminOverview(db, days), eventStats(db, days), adminRecentChecks(db), adminSubscriptions(db)]);
        const byPlan = subs.map((p) => ({ ...p, mrrEur: (PLANS[p.plan as keyof typeof PLANS]?.priceMonthlyMinor ?? 0) * p.active / 100 }));
        return { ...overview, events, recentChecks, revenue: { mrrEur: byPlan.reduce((a, p) => a + p.mrrEur, 0), byPlan } };
      });

      app.get('/api/admin/traffic', async (req, reply) => {
        if (!(await requireAdmin(req, reply))) return;
        const days = z.coerce.number().int().min(1).max(365).catch(30).parse((req.query as { days?: string }).days);
        return adminTraffic(db, days);
      });

      app.get('/api/admin/users', async (req, reply) => {
        if (!(await requireAdmin(req, reply))) return;
        const q = z.object({ q: z.string().trim().max(100).optional(), offset: z.coerce.number().int().min(0).max(100_000).catch(0) }).parse(req.query ?? {});
        return adminUsers(db, { ...(q.q && { q: q.q }), offset: q.offset, limit: 50 });
      });

      app.get('/api/admin/users/:id', async (req, reply) => {
        if (!(await requireAdmin(req, reply))) return;
        const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
        if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
        return (await adminUser(db, id.data)) ?? reply.code(404).send({ error: 'not_found' });
      });
    },

    async recordIdentification(req, x) {
      return safely(req, 'identification', async () => {
        const uid = await userId(req);
        if (!uid) return undefined;
        return dbRecordIdentification(db, {
          userId: uid,
          method: x.method,
          modelVersion: x.result.modelVersion,
          ...(x.gtin && { gtin: x.gtin }),
          imageCount: x.imageCount,
          candidates: x.result.candidates,
          confusableModels: x.result.confusableModels,
          ...(x.result.conditionGuess && { conditionGuess: x.result.conditionGuess }),
          identifyingText: x.result.identifyingText,
          usage: { ...x.result.usage, provider: x.provider, model: x.model, ...(x.result.costUsd !== undefined && { costUsd: x.result.costUsd }) },
        });
      });
    },

    async recordValuation(req, x) {
      return safely(req, 'valuation', async () => {
        const uid = await userId(req);
        if (!uid) return undefined;
        const r = x.result;
        const comparables = r.status === 'ok' ? r.estimate.comparables : r.comparables;
        const exclusionCounts: Record<string, number> = {};
        const sites: Record<string, number> = {};
        for (const c of comparables) {
          if (c.included) sites[c.item.marketplaceSite] = (sites[c.item.marketplaceSite] ?? 0) + 1;
          else {
            const k = c.exclusionReason ?? c.role;
            exclusionCounts[k] = (exclusionCounts[k] ?? 0) + 1;
          }
        }
        const common = {
          currency: x.body.currency,
          includedCount: r.status === 'ok' ? r.estimate.distribution.count : r.includedCount,
          fetchedCount: x.search.items.length,
          exclusionCounts,
          sites,
          feeProfileId: x.feeProfileId,
          fxRateDate: x.fx.rateDate,
          fxSource: x.fx.source,
          pricingAlgorithmVersion: r.status === 'ok' ? r.pricingAlgorithmVersion : r.algorithmVersion,
          ...(x.body.recognitionModelVersion && { recognitionModelVersion: x.body.recognitionModelVersion }),
          ...(x.search.oldestFetchedAt && { dataFetchedAt: x.search.oldestFetchedAt }),
        };
        let valuation: NewValuation;
        if (r.status === 'ok') {
          const p = r.profit.expected;
          valuation = {
            ...common,
            status: 'ok',
            dataKind: r.estimate.dataKind,
            fastSaleMinor: r.estimate.fast.amountMinor,
            expectedSaleMinor: r.estimate.expected.amountMinor,
            highSaleMinor: r.estimate.high.amountMinor,
            estimatedFeesMinor: p.marketplaceFee.amountMinor + p.paymentFee.amountMinor,
            estimatedShippingMinor: p.shipping.amountMinor,
            expectedNetMinor: p.net.amountMinor,
            expectedProfitMinor: p.profit.amountMinor,
            roiBp: p.roiPct === null ? null : Math.round(p.roiPct * 100),
            ...(r.maxBuyPrice && { maxBuyMinor: r.maxBuyPrice.amountMinor }),
            confidenceScore: r.estimate.confidence.score,
            confidenceLevel: r.estimate.confidence.level,
            confidenceFactors: r.estimate.confidence.factors,
            decision: r.decision.decision,
            decisionFactors: [...r.decision.factors],
            risks: [...r.decision.risks],
            distribution: r.estimate.distribution,
            market: r.estimate.market,
          };
        } else {
          valuation = { ...common, status: 'insufficient_data', insufficientReason: r.reason };
        }
        const p = x.product;
        return recordScan(db, {
          userId: uid,
          scan: {
            inputMethod: x.body.inputMethod,
            ...(x.body.identificationId && { identificationId: x.body.identificationId }),
            category: p.category,
            brand: p.brand,
            model: p.model,
            ...(p.capacity && { capacity: p.capacity }),
            ...(p.mount && { mount: p.mount }),
            ...(x.body.gtin && { gtin: x.body.gtin }),
            product: p,
            condition: x.body.condition,
            purchasePriceMinor: Math.round(x.body.purchasePrice * 100),
            currency: x.body.currency,
            status: r.status === 'ok' ? 'valued' : 'insufficient_data',
          },
          valuation,
          ...(x.body.identificationId && {
            identification: {
              id: x.body.identificationId,
              ...(x.body.chosenCandidateIndex !== undefined && { chosenIndex: x.body.chosenCandidateIndex }),
              finalProduct: {
                category: p.category,
                brand: p.brand,
                model: p.model,
                ...(p.capacity && { capacity: p.capacity }),
                ...(p.mount && { mount: p.mount }),
              },
            },
          }),
          marketplaceCalls: x.search.calls,
        });
      });
    },
  };
}
