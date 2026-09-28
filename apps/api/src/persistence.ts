import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  connect,
  costSummary,
  deleteScan,
  deleteUserData,
  exportUserData,
  listScans,
  recordIdentification as dbRecordIdentification,
  recordScan,
  runMigrations,
  touchUser,
  type Db,
  type NewValuation,
} from '@fliplens/db';
import { money, type FxRateTable, type InsufficientData, type NormalizedProduct, type Valuation } from '@fliplens/core';
import type { IdentificationResult } from '@fliplens/recognition';
import type { SearchResult } from '@fliplens/sources';

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
}

export async function initPersistence(url: string | undefined, log: FastifyBaseLogger): Promise<Persistence> {
  if (!url) {
    log.warn({ event: 'db_disabled' }, 'DATABASE_URL not set: scans are not stored');
    return disabled('disabled');
  }
  try {
    const { db } = connect(url);
    await runMigrations(db);
    log.info({ event: 'db_connected' }, 'database connected, migrations applied');
    return enabled(db, log);
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
      app.get('/api/me/export', unavailable);
      app.delete('/api/me', unavailable);
      app.get('/api/stats/costs', unavailable);
    },
    recordIdentification: async () => undefined,
    recordValuation: async () => undefined,
  };
}

function enabled(db: Db, log: FastifyBaseLogger): Persistence {
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

  return {
    status: 'connected',

    registerRoutes(app) {
      app.get('/api/scans', async (req, reply) => {
        const uid = await requireUser(req, reply);
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

      app.delete('/api/scans/:id', async (req, reply) => {
        const uid = await requireUser(req, reply);
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
        await deleteUserData(db, uid);
        for (const [k, v] of userCache) if (v === uid) userCache.delete(k);
        log.info({ event: 'user_data_deleted' }, 'user data deleted');
        return { deleted: true };
      });

      app.get('/api/stats/costs', async (req) => {
        const days = z.coerce.number().int().min(1).max(365).catch(30).parse((req.query as { days?: string }).days);
        return costSummary(db, days);
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
