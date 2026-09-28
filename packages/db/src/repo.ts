import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { events, productIdentifications, scans, subscriptions, usageCosts, userDevices, userSettings, users, valuations } from './schema.js';
import type * as schema from './schema.js';

type Db = PostgresJsDatabase<typeof schema>;

export type NewValuation = Omit<typeof valuations.$inferInsert, 'id' | 'scanId' | 'createdAt'>;
export type NewScan = Omit<typeof scans.$inferInsert, 'id' | 'userId' | 'createdAt'>;
export type ScanRow = typeof scans.$inferSelect;
export type ValuationRow = typeof valuations.$inferSelect;

/** Resolves an installation to its user, creating an anonymous user on first contact. */
export async function touchUser(db: Db, deviceKey: string): Promise<string> {
  const [dev] = await db
    .update(userDevices)
    .set({ lastSeenAt: sql`now()` })
    .where(eq(userDevices.deviceKey, deviceKey))
    .returning({ userId: userDevices.userId });
  if (dev) return dev.userId;
  return db.transaction(async (tx) => {
    const [u] = await tx.insert(users).values({}).returning({ id: users.id });
    await tx.insert(userDevices).values({ deviceKey, userId: u!.id }).onConflictDoNothing();
    const [again] = await tx.select({ userId: userDevices.userId }).from(userDevices).where(eq(userDevices.deviceKey, deviceKey));
    return again!.userId;
  });
}

export type UserRow = typeof users.$inferSelect;

export async function getUser(db: Db, userId: string): Promise<UserRow | undefined> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Signs this device in with Google. If the Google account already exists (signed in on another device),
 * this device's anonymous data is merged into it; otherwise the anonymous user becomes the account.
 */
export async function linkGoogle(db: Db, deviceKey: string, profile: GoogleProfile): Promise<UserRow> {
  const currentId = await touchUser(db, deviceKey);
  return db.transaction(async (tx) => {
    const identity = { email: profile.email, name: profile.name ?? null, picture: profile.picture ?? null, lastSeenAt: sql`now()` };
    const [existing] = await tx.select().from(users).where(eq(users.googleSub, profile.sub));
    if (!existing || existing.id === currentId) {
      const [u] = await tx.update(users).set({ googleSub: profile.sub, ...identity }).where(eq(users.id, currentId)).returning();
      return u!;
    }
    const target = existing.id;
    await tx.update(userDevices).set({ userId: target }).where(eq(userDevices.userId, currentId));
    await tx.update(scans).set({ userId: target }).where(eq(scans.userId, currentId));
    await tx.update(productIdentifications).set({ userId: target }).where(eq(productIdentifications.userId, currentId));
    await tx.update(usageCosts).set({ userId: target }).where(eq(usageCosts.userId, currentId));
    await tx.update(events).set({ userId: target }).where(eq(events.userId, currentId));
    const [targetSettings] = await tx.select({ userId: userSettings.userId }).from(userSettings).where(eq(userSettings.userId, target));
    if (!targetSettings) await tx.update(userSettings).set({ userId: target }).where(eq(userSettings.userId, currentId));
    await tx.delete(users).where(eq(users.id, currentId));
    const [u] = await tx.update(users).set(identity).where(eq(users.id, target)).returning();
    return u!;
  });
}

/** Sign out this installation. Its data stays with the account. */
export async function unlinkDevice(db: Db, deviceKey: string): Promise<void> {
  await db.delete(userDevices).where(eq(userDevices.deviceKey, deviceKey));
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

export async function getScan(db: Db, userId: string, scanId: string): Promise<{ scan: ScanRow; valuation: ValuationRow | null } | undefined> {
  const [row] = await db
    .select({ scan: scans, valuation: valuations })
    .from(scans)
    .leftJoin(valuations, eq(valuations.scanId, scans.id))
    .where(and(eq(scans.id, scanId), eq(scans.userId, userId)));
  return row;
}

export type SettingsRow = typeof userSettings.$inferSelect;
export type SettingsInput = Omit<typeof userSettings.$inferInsert, 'userId' | 'updatedAt'>;

export async function getSettings(db: Db, userId: string): Promise<SettingsRow | undefined> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return row;
}

export async function saveSettings(db: Db, userId: string, s: SettingsInput): Promise<SettingsRow> {
  const [row] = await db
    .insert(userSettings)
    .values({ ...s, userId })
    .onConflictDoUpdate({ target: userSettings.userId, set: { ...s, updatedAt: sql`now()` } })
    .returning();
  return row!;
}

export async function recordEvents(
  db: Db,
  userId: string | undefined,
  list: readonly { name: string; props: Record<string, string | number | boolean | null> }[],
): Promise<void> {
  if (list.length === 0) return;
  await db.insert(events).values(list.map((e) => ({ ...(userId && { userId }), name: e.name, props: e.props })));
}

/** Funnel counts per event name plus active devices: the beta metrics (scans per active user per week). */
export async function eventStats(db: Db, days = 7): Promise<{ days: number; activeUsers: number; byName: Record<string, number> }> {
  const since = sql`now() - make_interval(days => ${days})`;
  const rows = await db
    .select({ name: events.name, n: sql<number>`count(*)::int` })
    .from(events)
    .where(gte(events.createdAt, since))
    .groupBy(events.name);
  const [active] = await db
    .select({ n: sql<number>`count(distinct ${events.userId})::int` })
    .from(events)
    .where(gte(events.createdAt, since));
  return { days, activeUsers: active?.n ?? 0, byName: Object.fromEntries(rows.map((r) => [r.name, r.n])) };
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
    devices: await db.select({ createdAt: userDevices.createdAt, lastSeenAt: userDevices.lastSeenAt }).from(userDevices).where(eq(userDevices.userId, userId)),
    scans: await listScans(db, userId, 10_000),
    identifications: await db.select().from(productIdentifications).where(eq(productIdentifications.userId, userId)),
    settings: await getSettings(db, userId),
    events: await db.select().from(events).where(eq(events.userId, userId)),
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

// ---------- billing ----------

export type SubscriptionRow = typeof subscriptions.$inferSelect;

/** Stripe statuses that still grant the paid plan (past_due: grace while Stripe retries the card). */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export async function getSubscription(db: Db, userId: string): Promise<SubscriptionRow | undefined> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row;
}

export function effectivePlan(sub: SubscriptionRow | undefined): 'free' | 'pro' | 'reseller' {
  return sub && ACTIVE_STATUSES.has(sub.status) ? sub.plan : 'free';
}

export async function upsertSubscription(db: Db, s: Omit<typeof subscriptions.$inferInsert, 'updatedAt'>): Promise<void> {
  const { userId, ...rest } = s;
  await db
    .insert(subscriptions)
    .values(s)
    .onConflictDoUpdate({ target: subscriptions.userId, set: { ...rest, updatedAt: sql`now()` } });
}

export async function setStripeCustomer(db: Db, userId: string, customerId: string): Promise<void> {
  await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
}

export async function userIdByStripeCustomer(db: Db, customerId: string): Promise<string | undefined> {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.stripeCustomerId, customerId));
  return u?.id;
}

/** Valuations this calendar month (UTC): the unit the plans are metered in. */
export async function valuationsThisMonth(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scans)
    .where(and(eq(scans.userId, userId), gte(scans.createdAt, sql`date_trunc('month', now())`)));
  return row?.n ?? 0;
}

/** Recognition calls this calendar month: capped separately because each one costs an AI request. */
export async function identificationsThisMonth(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productIdentifications)
    .where(and(eq(productIdentifications.userId, userId), gte(productIdentifications.createdAt, sql`date_trunc('month', now())`)));
  return row?.n ?? 0;
}
