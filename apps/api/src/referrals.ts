import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { REFERRAL } from '@fliplens/core';
import {
  adminPayouts,
  adminReferrerCommissions,
  adminReferrers,
  decideReferralPayout,
  referralSummary,
  requestReferralPayout,
  reverseReferralCommission,
  setReferralCode,
  type Db,
} from '@fliplens/db';

/** Referral programme: the user's own page, payout requests, and the admin side. Rules live in REFERRAL (core). */

const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const PayoutBody = z.discriminatedUnion('method', [
  z.object({ method: z.literal('paypal'), email: z.string().trim().email().max(200) }),
  z.object({ method: z.literal('iban'), holder: z.string().trim().min(2).max(120), iban: z.string().transform((s) => s.replace(/\s+/g, '').toUpperCase()).pipe(z.string().regex(IBAN)) }),
]);

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined>;
type AdminGuard = (req: FastifyRequest, reply: FastifyReply) => Promise<boolean>;

export function registerReferralRoutes(app: FastifyInstance, deps: { db: Db; requireSignedIn: Guard; requireAdmin: AdminGuard }): void {
  const { db } = deps;

  app.get('/api/referral', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return;
    return { ...(await referralSummary(db, uid)), rules: REFERRAL };
  });

  app.post('/api/referral/payout', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return;
    const parsed = PayoutBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payout_details' });
    const b = parsed.data;
    const details = b.method === 'paypal' ? `PayPal: ${b.email}` : `${b.holder}, IBAN ${b.iban}`;
    const amount = await requestReferralPayout(db, uid, b.method, details, REFERRAL.minPayoutMinor);
    if (amount === 0) return reply.code(409).send({ error: 'below_minimum', minMinor: REFERRAL.minPayoutMinor });
    req.log.info({ event: 'referral_payout_requested', amountMinor: amount }, 'payout requested');
    return { requestedMinor: amount };
  });

  // ---------- admin ----------

  app.get('/api/admin/referrals', async (req, reply) => {
    if (!(await deps.requireAdmin(req, reply))) return;
    const [referrers, payouts] = await Promise.all([adminReferrers(db), adminPayouts(db)]);
    return { referrers, payouts, rules: REFERRAL };
  });

  app.get('/api/admin/referrals/:userId', async (req, reply) => {
    if (!(await deps.requireAdmin(req, reply))) return;
    const id = z.string().uuid().safeParse((req.params as { userId?: string }).userId);
    if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
    return { commissions: await adminReferrerCommissions(db, id.data) };
  });

  app.put('/api/admin/referrals/:userId/code', async (req, reply) => {
    if (!(await deps.requireAdmin(req, reply))) return;
    const id = z.string().uuid().safeParse((req.params as { userId?: string }).userId);
    const code = z.object({ code: z.string().trim().toLowerCase() }).safeParse(req.body);
    if (!id.success || !code.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await setReferralCode(db, id.data, code.data.code))) return reply.code(409).send({ error: 'code_unavailable', message: '3-24 characters a-z, 0-9 and dashes, not used by anyone else.' });
    return { code: code.data.code };
  });

  app.post('/api/admin/payouts/:id', async (req, reply) => {
    if (!(await deps.requireAdmin(req, reply))) return;
    const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
    const body = z.object({ decision: z.enum(['paid', 'rejected']), note: z.string().trim().max(300).optional() }).safeParse(req.body);
    if (!id.success || !body.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await decideReferralPayout(db, id.data, body.data.decision, body.data.note ?? null))) return reply.code(409).send({ error: 'not_open' });
    req.log.info({ event: 'referral_payout_decided', decision: body.data.decision }, 'payout decided');
    return { ok: true };
  });

  app.post('/api/admin/commissions/:id/reverse', async (req, reply) => {
    if (!(await deps.requireAdmin(req, reply))) return;
    const id = z.string().uuid().safeParse((req.params as { id?: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'invalid_id' });
    if (!(await reverseReferralCommission(db, id.data))) return reply.code(409).send({ error: 'not_reversible' });
    return { ok: true };
  });
}
