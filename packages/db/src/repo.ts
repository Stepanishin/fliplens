import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { productIdentifications, scans, usageCosts, users, valuations } from './schema.js';
import type * as schema from './schema.js';

type Db = PostgresJsDatabase<typeof schema>;

export type NewValuation = Omit<typeof valuations.$inferInsert, 'id' | 'scanId' | 'createdAt'>;
export type NewScan = Omit<typeof scans.$inferInsert, 'id' | 'userId' | 'createdAt'>;
export type ScanRow = typeof scans.$inferSelect;
export type ValuationRow = typeof valuations.$inferSelect;

export async function touchUser(db: Db, deviceKey: string): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ deviceKey })
    .onConflictDoUpdate({ target: users.deviceKey, set: { lastSeenAt: sql`now()` } })
    .returning({ id: users.id });
  return row!.id;
}

export interface UsageInput {
  userId?: string;
  scanId?: string;
  identificationId?: string;
  kind: 'vision' | 'text_llm' | 'marketplace_api';
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  calls?: number;
  costUsd?: number;
}

export async function recordUsage(db: Db, u: UsageInput): Promise<void> {
  await db.insert(usageCosts).values({
    ...(u.userId && { userId: u.userId }),
    ...(u.scanId && { scanId: u.scanId }),
    ...(u.identificationId && { identificationId: u.identificationId }),
    kind: u.kind,
    provider: u.provider,
    ...(u.model && { model: u.model }),
    inputTokens: u.inputTokens ?? 0,
    outputTokens: u.outputTokens ?? 0,
    calls: u.calls ?? 1,
    costMicroUsd: Math.round((u.costUsd ?? 0) * 1_000_000),
  });
}

export interface IdentificationInput {
  userId: string;
  method: 'photo' | 'barcode';
  modelVersion: string;
  gtin?: string;
  imageCount: number;
  candidates: readonly { brand: string; model: string; confidence: number }[];
  confusableModels: readonly string[];
  conditionGuess?: string;
  identifyingText: readonly string[];
  usage: { inputTokens: number; outputTokens: number; costUsd?: number; provider: string; model: string };
}

export async function recordIdentification(db: Db, i: IdentificationInput): Promise<string> {
  const [row] = await db
    .insert(productIdentifications)
    .values({
      userId: i.userId,
      method: i.method,
      modelVersion: i.modelVersion,
      ...(i.gtin && { gtin: i.gtin }),
      imageCount: i.imageCount,
      candidates: i.candidates,
      confusableModels: [...i.confusableModels],
      ...(i.conditionGuess && { conditionGuess: i.conditionGuess }),
      identifyingText: [...i.identifyingText],
      topConfidence: i.candidates[0]?.confidence ?? null,
    })
    .returning({ id: productIdentifications.id });
  await recordUsage(db, {
    userId: i.userId,
    identificationId: row!.id,
    kind: i.method === 'photo' ? 'vision' : 'text_llm',
    provider: i.usage.provider,
    model: i.usage.model,
    inputTokens: i.usage.inputTokens,
    outputTokens: i.usage.outputTokens,
    ...(i.usage.costUsd !== undefined && { costUsd: i.usage.costUsd }),
  });
  return row!.id;
}

const IDENTITY_FIELDS = ['category', 'brand', 'model', 'capacity', 'mount'] as const;
type Identity = Partial<Record<(typeof IDENTITY_FIELDS)[number], string>>;

/** Field-level diff between the candidate the user picked and what they finally valued. */
export function identityDiff(chosen: Identity | undefined, final: Identity): Record<string, [string | null, string | null]> {
  const norm = (v: string | undefined): string | null => (v && v.trim() ? v.trim().toLowerCase() : null);
  const diff: Record<string, [string | null, string | null]> = {};
  for (const f of IDENTITY_FIELDS) {
    const a = norm(chosen?.[f]);
    const b = norm(final[f]);
    if (a !== b) diff[f] = [chosen?.[f] ?? null, final[f] ?? null];
  }
  return diff;
}

export interface ScanInput {
  userId: string;
  scan: NewScan;
  valuation: NewValuation;
  /** Link back to the recognition result so user corrections are logged (confidence calibration). */
  identification?: { id: string; chosenIndex?: number; finalProduct: Identity };
  marketplaceCalls: number;
}

export async function recordScan(db: Db, input: ScanInput): Promise<string> {
  return db.transaction(async (tx) => {
    const [scan] = await tx.insert(scans).values({ ...input.scan, userId: input.userId }).returning({ id: scans.id });
    const scanId = scan!.id;
    await tx.insert(valuations).values({ ...input.valuation, scanId });
    if (input.identification) {
      const [ident] = await tx
        .select({ candidates: productIdentifications.candidates })
        .from(productIdentifications)
        .where(and(eq(productIdentifications.id, input.identification.id), eq(productIdentifications.userId, input.userId)));
      if (ident) {
        const idx = input.identification.chosenIndex;
        const chosen = idx !== undefined ? (ident.candidates as Identity[])[idx] : undefined;
        const diff = identityDiff(chosen, input.identification.finalProduct);
        await tx
          .update(productIdentifications)
          .set({
            chosenIndex: idx ?? null,
            finalProduct: input.identification.finalProduct,
            corrected: idx === undefined || Object.keys(diff).length > 0,
            correction: diff,
          })
          .where(eq(productIdentifications.id, input.identification.id));
      }
    }
    if (input.marketplaceCalls > 0) {
      await tx.insert(usageCosts).values({ userId: input.userId, scanId, kind: 'marketplace_api', provider: 'ebay', calls: input.marketplaceCalls });
    }
    return scanId;
  });
}

export async function listScans(db: Db, userId: string, limit = 50): Promise<{ scan: ScanRow; valuation: ValuationRow | null }[]> {
  return db
    .select({ scan: scans, valuation: valuations })
    .from(scans)
    .leftJoin(valuations, eq(valuations.scanId, scans.id))
    .where(eq(scans.userId, userId))
    .orderBy(desc(scans.createdAt))
    .limit(limit);
}

export async function deleteScan(db: Db, userId: string, scanId: string): Promise<boolean> {
  const rows = await db.delete(scans).where(and(eq(scans.id, scanId), eq(scans.userId, userId))).returning({ id: scans.id });
  return rows.length > 0;
}

/** GDPR: removes the user and, via cascades, all their scans, valuations, identifications and cost rows. */
export async function deleteUserData(db: Db, userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}

export async function exportUserData(db: Db, userId: string): Promise<unknown> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return {
    user,
    scans: await listScans(db, userId, 10_000),
    identifications: await db.select().from(productIdentifications).where(eq(productIdentifications.userId, userId)),
  };
}

export interface CostSummary {
  days: number;
  totalUsd: number;
  byKind: Record<string, { usd: number; calls: number }>;
  successfulValuations: number;
  costPerSuccessfulValuationUsd: number | null;
  identifications: number;
  correctionRate: number | null;
}

export async function costSummary(db: Db, days = 30): Promise<CostSummary> {
  const since = sql`now() - make_interval(days => ${days})`;
  const byKindRows = await db
    .select({ kind: usageCosts.kind, micro: sql<number>`coalesce(sum(${usageCosts.costMicroUsd}), 0)::int`, calls: sql<number>`coalesce(sum(${usageCosts.calls}), 0)::int` })
    .from(usageCosts)
    .where(gte(usageCosts.createdAt, since))
    .groupBy(usageCosts.kind);
  const [ok] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(valuations)
    .where(and(eq(valuations.status, 'ok'), gte(valuations.createdAt, since)));
  const [ids] = await db
    .select({ n: sql<number>`count(*)::int`, used: sql<number>`count(${productIdentifications.corrected})::int`, corrected: sql<number>`count(*) filter (where ${productIdentifications.corrected})::int` })
    .from(productIdentifications)
    .where(gte(productIdentifications.createdAt, since));
  const byKind: CostSummary['byKind'] = {};
  let total = 0;
  for (const r of byKindRows) {
    byKind[r.kind] = { usd: r.micro / 1_000_000, calls: r.calls };
    total += r.micro / 1_000_000;
  }
  const n = ok?.n ?? 0;
  return {
    days,
    totalUsd: total,
    byKind,
    successfulValuations: n,
    costPerSuccessfulValuationUsd: n > 0 ? total / n : null,
    identifications: ids?.n ?? 0,
    correctionRate: ids && ids.used > 0 ? ids.corrected / ids.used : null,
  };
}
