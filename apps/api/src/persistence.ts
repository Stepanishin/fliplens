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
  radarFramesToday,
  recordUsage,
  listingsThisMonth,
  applyReferral,
  linkGoogle,
  userIdByGoogleSub,
  userIdByReferralCode,
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
import { money, PLANS, RADAR_FRAMES_PER_DAY, type FxRateTable, type InsufficientData, type NormalizedProduct, type Valuation } from '@fliplens/core';
import type { IdentificationResult } from '@fliplens/recognition';
import type { SearchResult } from '@fliplens/sources';
import { verifyGoogleIdToken } from './google.js';
import { registerEbayPublishRoutes, type EbaySellConfig } from './ebay-publish.js';
import { createBilling, limitsPlan, type BillingConfig, type Quota } from './billing.js';
import { registerInventoryRoutes } from './inventory.js';
import { registerAlertRoutes, startAlertWorker, type AlertsConfig } from './alerts.js';
import type { EbayAdapter, EcbFxService } from '@fliplens/sources';
import { registerListingRoutes } from './listing.js';
import { registerReferralRoutes } from './referrals.js';
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
    inputMethod: 'photo' | 'barcode' | 'manual' | 'listing';
    identificationId?: string | undefined;
    chosenCandidateIndex?: number | undefined;
    gtin?: string | undefined;
    condition: string;
    purchasePrice: number;
    /** False: checked without a price; purchasePrice is then the max buy price. */
    priceProvided: boolean;
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
    x: { method: 'photo' | 'barcode' | 'listing'; gtin?: string; imageCount: number; result: IdentificationResult; provider: string; model: string },
  ): Promise<string | undefined>;
  recordValuation(req: FastifyRequest, x: ValuationRecord): Promise<string | undefined>;
  /** Plan usage for the caller; undefined when there is no database (no metering). */
  quota(req: FastifyRequest): Promise<Quota | undefined>;
  /**
   * Gate for paid-for work (recognition, valuation): the caller must be signed in, and recognition calls are capped
   * at IDENTIFY_FACTOR x the plan's monthly checks. Returns false after sending the error response.
   */
  requireAccount(req: FastifyRequest, reply: FastifyReply, kind: 'valuation' | 'identification'): Promise<boolean>;
  /** Signed-in users only; guests get 401 members_only (the app shows sign-in). */
  requireMember(req: FastifyRequest, reply: FastifyReply): Promise<boolean>;
  /** Any visitor with a device id (guests included): for cheap helpers that must not use up the guest trial. */
  requireVisitor(req: FastifyRequest, reply: FastifyReply): Promise<boolean>;
  /** The caller's own stored check (product and condition), for follow-ups such as the UK vs EU comparison. */
  ownScan(req: FastifyRequest, scanId: string): Promise<{ product: NormalizedProduct; condition: string; currency: string } | undefined>;
  /** Live radar gate: signed in with Google, frames left today, AI spend under the hard stop. Sends the error itself. */
  requireRadar(req: FastifyRequest, reply: FastifyReply): Promise<boolean>;
  /** One radar frame's AI cost (no identification row: frames do not use up the recognition limit). */
  recordRadarFrame(req: FastifyRequest, x: { model: string; inputTokens: number; outputTokens: number; costUsd?: number | undefined }): Promise<void>;
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
  'item_status_changed', 'listing_generated', 'listing_copied', 'visit', 'page_view', 'cta_clicked', 'signin_started', 'quick_listing_opened', 'find_shared', 'referral_link_copied', 'referral_link_shared', 'referral_payout_requested', 'shelf_scan_started', 'shelf_scan_done', 'inapp_link_copied', 'inapp_open_chrome', 'guest_started', 'trial_used',
  'landing_engaged', 'landing_try', 'batch_opened', 'batch_started', 'batch_item_valued', 'batch_listings_all', 'price_alert_created', 'clothes_platform_set', 'app_updated',
  'radar_started', 'radar_frame', 'radar_check', 'market_compare', 'ebay_connect_started', 'ebay_publish_opened', 'ebay_published',
] as const;
const EventsBody = z.object({
  events: z
    .array(
      z.object({
        // Any short name passes validation; unknown ones are dropped below, so one new event name in a client
        // batch cannot get the whole batch (visits included) rejected.
        name: z.string().max(40),
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
  /** Publishing on eBay (Sell APIs); off without EBAY_RUNAME / EBAY_TOKEN_KEY. */
  ebaySell?: EbaySellConfig | undefined;
  /** Price alerts (web push); off without VAPID keys. */
  alerts?: { cfg: AlertsConfig; ebay: EbayAdapter; fx: EcbFxService } | undefined;
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
      app.get('/api/referral', unavailable);
      app.post('/api/referral/payout', unavailable);
      app.get('/api/admin/referrals', unavailable);
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
    requireVisitor: async () => true,
    requireMember: async () => true,
    aiMode: async () => 'full',
    requireRadar: async () => true,
    ownScan: async () => undefined,
    recordRadarFrame: async () => undefined,
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

  /**
   * Try before signing in: one check (with a few recognition attempts) and one photo listing per device, capped per
   * IP and per day overall so a viral video cannot run up the AI bill. Counters per IP/day live in memory (one
   * instance); per device they come from the database. Exceeded: 401 trial_used (the app then asks to sign in).
   */
  // Two checks: guests who tried one and wanted a second left at the limit instead of signing in (ADR-032).
  const TRIAL_PER_DEVICE = { valuation: 2, identification: 5, listing: 1 } as const;
  const TRIAL_PER_IP_DAY = { valuation: 6, identification: 15, listing: 3 } as const;
  const TRIAL_PER_DAY = { valuation: 400, identification: 1200, listing: 400 } as const;
  type TrialKind = keyof typeof TRIAL_PER_DEVICE;
  const trialCounts = new Map<string, number>();
  const bump = (key: string): number => {
    const n = (trialCounts.get(key) ?? 0) + 1;
    trialCounts.set(key, n);
    if (trialCounts.size > 50_000) trialCounts.clear();
    return n;
  };
  const trial = async (req: FastifyRequest, reply: FastifyReply, uid: string, kind: TrialKind): Promise<boolean> => {
    const day = new Date().toISOString().slice(0, 10);
    const usedHere =
      kind === 'valuation'
        ? (await listScans(db, uid, 5)).length
        : kind === 'identification'
          ? await identificationsThisMonth(db, uid)
          : await listingsThisMonth(db, uid);
    const ip = trialCounts.get(`${day}|${req.ip}|${kind}`) ?? 0;
    const all = trialCounts.get(`${day}|*|${kind}`) ?? 0;
    if (usedHere >= TRIAL_PER_DEVICE[kind] || ip >= TRIAL_PER_IP_DAY[kind] || all >= TRIAL_PER_DAY[kind]) {
      req.log.info({ event: 'trial_used', kind, reason: usedHere >= TRIAL_PER_DEVICE[kind] ? 'device' : ip >= TRIAL_PER_IP_DAY[kind] ? 'ip' : 'global' }, 'trial limit');
      void reply.code(401).send({ error: 'trial_used', message: 'Sign in with Google to keep going: 10 free checks a month.' });
      return false;
    }
    bump(`${day}|${req.ip}|${kind}`);
    bump(`${day}|*|${kind}`);
    if (trialCounts.size % 1000 === 0) for (const k of trialCounts.keys()) if (!k.startsWith(day)) trialCounts.delete(k);
    return true;
  };
  /** Signed-in users pass; guests pass while their trial lasts. Returns the user id or sends the error. */
  const allowTrial = (kind: TrialKind) => async (req: FastifyRequest, reply: FastifyReply): Promise<string | undefined> => {
    const uid = await requireUser(req, reply);
    if (!uid) return undefined;
    const u = await getUser(db, uid);
    if (u?.googleSub) return uid;
    return (await trial(req, reply, uid, kind)) ? uid : undefined;
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

  const billing = auth.billing ? createBilling(db, auth.billing, log, isAdmin) : undefined;

  return {
    status: 'connected',

    requireAdmin,

    async requireAccount(req, reply, kind) {
      const uid = await requireUser(req, reply);
      if (!uid) return false;
      if (!(await getUser(db, uid))?.googleSub) return trial(req, reply, uid, kind);
      if (kind === 'identification' && billing) {
        const q = await billing.quota(uid);
        const used = await identificationsThisMonth(db, uid);
        if (used >= q.limit * IDENTIFY_FACTOR) {
          req.log.info({ event: 'identify_limit', plan: q.plan }, 'recognition limit reached');
          void reply.code(402).send({ error: 'identify_limit', message: `You reached this month's recognition limit of your ${q.plan} plan.`, quota: q });
          return false;
        }
        // Hard stop for AI spend (abuse, bugs): 2x the plan budget. Barcode and typing still work.
        if ((await aiCostThisMonth(db, uid)) >= PLANS[limitsPlan(q)].aiBudgetMicroUsd * 2) {
          req.log.warn({ event: 'ai_budget_exhausted', plan: q.plan }, 'AI budget exhausted');
          void reply.code(402).send({ error: 'ai_budget', message: 'Photo recognition is paused for this month. You can still scan barcodes or type the item.', quota: q });
          return false;
        }
      }
      return true;
    },

    async requireMember(req, reply) {
      const uid = await requireUser(req, reply);
      if (!uid) return false;
      if ((await getUser(db, uid))?.googleSub) return true;
      void reply.code(401).send({ error: 'members_only', message: 'Sign in with Google to scan whole tables.' });
      return false;
    },

    async ownScan(req, scanId) {
      const uid = await userId(req);
      if (!uid) return undefined;
      const row = await getScan(db, uid, scanId);
      return row ? { product: row.scan.product as NormalizedProduct, condition: row.scan.condition, currency: row.scan.currency } : undefined;
    },

    async requireRadar(req, reply) {
      const uid = await requireUser(req, reply);
      if (!uid) return false;
      if (!(await getUser(db, uid))?.googleSub) {
        void reply.code(401).send({ error: 'members_only', message: 'Sign in with Google to use the live radar.' });
        return false;
      }
      if (!billing) return true;
      const q = await billing.quota(uid);
      const [frames, spent] = await Promise.all([radarFramesToday(db, uid), aiCostThisMonth(db, uid)]);
      if (spent >= PLANS[limitsPlan(q)].aiBudgetMicroUsd * 2) {
        void reply.code(402).send({ error: 'ai_budget', message: 'Photo recognition is paused for this month. You can still scan barcodes or type the item.', quota: q });
        return false;
      }
      if (frames >= RADAR_FRAMES_PER_DAY[limitsPlan(q)]) {
        void reply.code(429).send({ error: 'radar_limit', message: 'Live radar limit for today reached. Take a photo of the table instead.', plan: q.plan });
        return false;
      }
      return true;
    },

    async recordRadarFrame(req, x) {
      await safely(req, 'radar', async () => {
        const uid = await userId(req);
        if (!uid) return undefined;
        await recordUsage(db, { userId: uid, kind: 'vision', provider: 'openai', model: x.model, inputTokens: x.inputTokens, outputTokens: x.outputTokens, ...(x.costUsd !== undefined && { costUsd: x.costUsd }) });
        return undefined;
      });
    },

    async requireVisitor(req, reply) {
      return Boolean(await requireUser(req, reply));
    },

    async aiMode(req) {
      if (!billing) return 'full';
      const uid = await userId(req);
      if (!uid) return 'full';
      const q = await billing.quota(uid);
      const spent = await aiCostThisMonth(db, uid);
      if (spent < PLANS[limitsPlan(q)].aiBudgetMicroUsd) return 'full';
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
      if (auth.alerts) {
        const a = auth.alerts;
        const getScanFor = async (req: FastifyRequest, scanId: string) => {
          const uid = await userId(req);
          const row = uid ? await getScan(db, uid, scanId) : undefined;
          return row ? { product: row.scan.product as NormalizedProduct, condition: row.scan.condition, currency: row.scan.currency } : undefined;
        };
        registerAlertRoutes(app, {
          db,
          cfg: a.cfg,
          ebay: a.ebay,
          fx: a.fx,
          requireSignedIn,
          planOf: async (uid) => (billing ? limitsPlan(await billing.quota(uid)) : 'free'),
          ownScan: getScanFor,
        });
        // Local development shares the database with production: ALERTS_WORKER=0 keeps a laptop from taking prod's jobs.
        if (process.env.ALERTS_WORKER !== '0') startAlertWorker({ db, cfg: a.cfg, ebay: a.ebay, fx: a.fx }, log);
      }
      app.get('/api/alerts/available', async () => ({ available: Boolean(auth.alerts) }));
      registerReferralRoutes(app, { db, requireSignedIn, requireAdmin });
      if (auth.ebaySell) registerEbayPublishRoutes(app, { db, cfg: auth.ebaySell, requireSignedIn });
      app.get('/api/ebay/available', async () => ({ available: Boolean(auth.ebaySell) }));
      if (auth.listingWriter) {
        registerListingRoutes(app, { db, writer: auth.listingWriter, requireSignedIn, allowTrial: allowTrial('listing'), ...(billing && { quota: (uid: string) => billing.quota(uid) }) });
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
        const body = z.object({ credential: z.string().min(20).max(5000), invite: z.string().trim().toLowerCase().max(40).optional() }).safeParse(req.body);
        if (!body.success) return reply.code(400).send({ error: 'invalid_request' });
        let profile;
        try {
          profile = await verifyGoogleIdToken(body.data.credential, auth.googleClientId);
        } catch (e) {
          req.log.warn({ event: 'google_login_rejected', err: e instanceof Error ? e.message : String(e) }, 'google login rejected');
          return reply.code(401).send({ error: 'invalid_google_token', message: 'Google sign-in could not be verified. Try again.' });
        }
        const isNewAccount = !(await userIdByGoogleSub(db, profile.sub));
        const u = await linkGoogle(db, key, profile);
        userCache.delete(key);
        // Invite links count only for accounts created now (not for people who already had FlipLens).
        if (isNewAccount && body.data.invite) {
          const referrerId = await userIdByReferralCode(db, body.data.invite);
          if (referrerId && (await applyReferral(db, u.id, referrerId))) req.log.info({ event: 'referral_applied' }, 'invited user signed up');
        }
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
          product: {
            category: scan.category,
            brand: scan.brand,
            model: scan.model,
            capacity: scan.capacity,
            mount: scan.mount,
            ...((scan.product as NormalizedProduct).fashion && { fashion: (scan.product as NormalizedProduct).fashion }),
          },
          excludeModels: (scan.product as NormalizedProduct).excludeModels ?? [],
          condition: scan.condition,
          purchasePrice: money(scan.purchasePriceMinor / 100, 'EUR'),
          priceProvided: scan.priceProvided,
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
        const known = parsed.data.events.filter((e) => (EVENT_NAMES as readonly string[]).includes(e.name));
        const unknown = parsed.data.events.length - known.length;
        if (unknown > 0) req.log.warn({ event: 'unknown_events', names: [...new Set(parsed.data.events.filter((e) => !known.includes(e)).map((e) => e.name))].join(',') }, 'dropped unknown analytics events');
        if (known.length > 0) await safely(req, 'events', () => recordEvents(db, uid, known.map((e) => ({ name: e.name as (typeof EVENT_NAMES)[number], props: e.props ?? {} })), visitor));
        return { stored: known.length };
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
            priceProvided: x.body.priceProvided,
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
