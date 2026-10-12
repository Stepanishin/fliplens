import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { PLANS, REFERRAL, planByLookupKey, type PlanId } from '@fliplens/core';
import {
  firstReferralPaymentAt,
  recordReferralCommission,
  referrerOf,
  effectivePlan,
  getSubscription,
  getUser,
  setStripeCustomer,
  upsertSubscription,
  userIdByStripeCustomer,
  valuationsThisMonth,
  type Db,
} from '@fliplens/db';

/**
 * Stripe billing: Checkout for new subscriptions, Customer Portal for changes/cancellation, webhooks as the only
 * writer of the local subscription mirror. Test keys by default; a live key is refused unless STRIPE_ALLOW_LIVE=1.
 */

export interface BillingConfig {
  secretKey?: string | undefined;
  /** Require ticking "I agree to the Terms" in Checkout (needs the Terms URL set in Stripe > Settings > Public details). */
  requireTermsConsent: boolean;
  /** Stripe Tax: VAT by the buyer's country (needs Stripe Tax set up with your origin address). */
  automaticTax: boolean;
  webhookSecret?: string | undefined;
  /** Public origin for Stripe return URLs; when unset or invalid, the request's own origin is used. */
  appUrl?: string | undefined;
  allowLive: boolean;
}

/** UI languages; Stripe Checkout, Customer Portal and receipts follow them. */
const LOCALE = z.enum(['en', 'de']);

export function billingConfigFromEnv(env: NodeJS.ProcessEnv): BillingConfig {
  return {
    // Local development uses the test key even if a live key is also present in .env.
    secretKey: env.STRIPE_SECRET_KEY_TEST || env.STRIPE_SECRET_KEY || undefined,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET_TEST || env.STRIPE_WEBHOOK_SECRET || undefined,
    appUrl: env.APP_URL || undefined,
    allowLive: env.STRIPE_ALLOW_LIVE === '1',
    requireTermsConsent: env.STRIPE_REQUIRE_TERMS === '1',
    automaticTax: env.STRIPE_AUTOMATIC_TAX === '1',
  };
}

function validOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : undefined;
  } catch {
    return undefined;
  }
}

export interface Quota {
  plan: PlanId;
  used: number;
  limit: number;
  remaining: number;
}

export interface Billing {
  readonly enabled: boolean;
  quota(userId: string): Promise<Quota>;
  /** Cancels any running subscription immediately (account deletion). Throws if Stripe cannot be reached. */
  cancelForDeletion(userId: string): Promise<void>;
  registerRoutes(app: FastifyInstance, deps: { requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined> }): void;
}

export function createBilling(db: Db, cfg: BillingConfig, log: FastifyBaseLogger): Billing {
  let stripe: Stripe | undefined;
  if (!cfg.secretKey) log.warn({ event: 'billing_disabled' }, 'no Stripe key: billing disabled');
  else if (cfg.secretKey.startsWith('sk_live_') && !cfg.allowLive) {
    log.error({ event: 'billing_disabled' }, 'refusing a LIVE Stripe key without STRIPE_ALLOW_LIVE=1');
  } else stripe = new Stripe(cfg.secretKey);

  // APP_URL must be an absolute http(s) URL (Stripe rejects anything else); fall back to the request origin.
  const configuredUrl = validOrigin(cfg.appUrl);
  if (cfg.appUrl && !configuredUrl) log.error({ event: 'app_url_invalid' }, 'APP_URL is not a valid http(s) URL: using the request origin');
  const publicUrl = (req: FastifyRequest): string => configuredUrl ?? `${req.protocol}://${req.host}`;

  /**
   * The stored Stripe customer, if it exists for the current key. Customers are per mode: an id saved while running
   * on the test key does not exist on the live key (and the other way round), so such ids are treated as absent.
   */
  async function existingCustomer(s: Stripe, customerId: string | null | undefined): Promise<string | undefined> {
    if (!customerId) return undefined;
    try {
      const c = await s.customers.retrieve(customerId);
      return c.deleted ? undefined : c.id;
    } catch (e) {
      if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === 'resource_missing') return undefined;
      throw e;
    }
  }

  async function quota(userId: string): Promise<Quota> {
    const plan = effectivePlan(await getSubscription(db, userId));
    const used = await valuationsThisMonth(db, userId);
    const limit = PLANS[plan].monthlyValuations;
    return { plan, used, limit, remaining: Math.max(0, limit - used) };
  }

  async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
    // The Stripe account may also serve other products: only subscriptions to a FlipLens price are ours.
    const item = sub.items.data[0];
    const plan = planByLookupKey(item?.price.lookup_key);
    if (!plan) {
      log.info({ event: 'billing_foreign_subscription', price: item?.price.id }, 'ignoring a subscription that is not a FlipLens plan');
      return;
    }
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const known = await userIdByStripeCustomer(db, customerId);
    // metadata.userId is only trusted together with our own customer record (set at checkout).
    const userId = known ?? (sub.metadata.userId && (await getUser(db, sub.metadata.userId)) ? sub.metadata.userId : undefined);
    if (!userId) {
      log.error({ event: 'billing_unknown_customer', customerId }, 'subscription for unknown customer');
      return;
    }
    const periodEnd = item?.current_period_end;
    await upsertSubscription(db, {
      userId,
      stripeSubscriptionId: sub.id,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
    log.info({ event: 'subscription_synced', plan, status: sub.status }, 'subscription synced');
  }

  /**
   * Referral commission for a paid invoice of an invited user: REFERRAL.sharePct of the amount without tax, for
   * payments within REFERRAL.months of their first commissioned payment. Idempotent per invoice (webhook retries).
   */
  async function creditReferral(inv: Stripe.Invoice): Promise<void> {
    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    if (!customerId || !inv.id || inv.amount_paid <= 0) return;
    const userId = await userIdByStripeCustomer(db, customerId);
    if (!userId) return; // not a FlipLens customer (shared Stripe account)
    const referrerId = await referrerOf(db, userId);
    if (!referrerId) return;
    const first = await firstReferralPaymentAt(db, userId);
    if (first) {
      const end = new Date(first);
      end.setMonth(end.getMonth() + REFERRAL.months);
      if (Date.now() > end.getTime()) return;
    }
    const base = Math.min(inv.amount_paid, inv.total_excluding_tax ?? inv.amount_paid);
    const commission = Math.round((base * REFERRAL.sharePct) / 100);
    if (commission <= 0) return;
    const created = await recordReferralCommission(db, {
      referrerId,
      referredUserId: userId,
      stripeInvoiceId: inv.id,
      baseMinor: base,
      commissionMinor: commission,
      currency: inv.currency.toUpperCase(),
      availableAt: new Date(Date.now() + REFERRAL.holdDays * 86_400_000),
    });
    if (created) log.info({ event: 'referral_commission', commissionMinor: commission }, 'referral commission recorded');
  }

  async function cancelForDeletion(userId: string): Promise<void> {
    const sub = await getSubscription(db, userId);
    if (!sub || ['canceled', 'incomplete_expired'].includes(sub.status)) return;
    if (!stripe) throw new Error('Stripe is not configured but the user has a subscription');
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId, { invoice_now: false, prorate: false });
    } catch (e) {
      // Created under the other Stripe mode (test vs live): nothing to cancel with this key.
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError && e.code === 'resource_missing')) throw e;
    }
    log.info({ event: 'subscription_cancelled_for_deletion' }, 'subscription cancelled before account deletion');
  }

  return {
    enabled: stripe !== undefined,
    quota,
    cancelForDeletion,

    registerRoutes(app, { requireUser }) {
      app.get('/api/billing', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        // Ended subscriptions (canceled, unpaid, ...) are history: the user is on Free and must be able to subscribe again.
        const stored = await getSubscription(db, uid);
        const sub = stored && effectivePlan(stored) !== 'free' ? stored : undefined;
        return {
          enabled: stripe !== undefined,
          quota: await quota(uid),
          subscription: sub && {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          },
          plans: Object.values(PLANS).map((p) => ({ id: p.id, name: p.name, priceMonthlyMinor: p.priceMonthlyMinor, monthlyValuations: p.monthlyValuations, features: p.features })),
        };
      });

      app.post('/api/billing/checkout', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        if (!stripe) return reply.code(503).send({ error: 'billing_disabled', message: 'Payments are not configured' });
        const body = z.object({ plan: z.enum(['pro', 'reseller']), locale: LOCALE.optional() }).safeParse(req.body);
        if (!body.success) return reply.code(400).send({ error: 'invalid_plan' });
        const base = publicUrl(req);
        const user = await getUser(db, uid);
        if (!user?.googleSub) return reply.code(401).send({ error: 'sign_in_required', message: 'Sign in with Google to subscribe' });

        const lookupKey = PLANS[body.data.plan].stripeLookupKey!;
        const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
        const price = prices.data[0];
        if (!price) return reply.code(500).send({ error: 'price_missing', message: `Run the Stripe setup script (missing ${lookupKey})` });

        let customerId = await existingCustomer(stripe, user.stripeCustomerId);
        if (!customerId) {
          // preferred_locales: Stripe receipts and invoices in the user's language.
          const c = await stripe.customers.create({ ...(user.email && { email: user.email }), ...(user.name && { name: user.name }), ...(body.data.locale && { preferred_locales: [body.data.locale] }), metadata: { userId: uid } });
          customerId = c.id;
          await setStripeCustomer(db, uid, customerId);
        }
        const params = (withConsent: boolean): Stripe.Checkout.SessionCreateParams => ({
          mode: 'subscription',
          ...(body.data.locale && { locale: body.data.locale }),
          customer: customerId,
          client_reference_id: uid,
          line_items: [{ price: price.id, quantity: 1 }],
          subscription_data: { metadata: { userId: uid, plan: body.data.plan } },
          allow_promotion_codes: true,
          custom_text: {
            submit: { message: `${body.data.locale === 'de' ? `Mit dem Abo stimmst du den FlipLens-Nutzungsbedingungen zu (${base}/terms). Verbraucher in der EU haben ein 14-tägiges Widerrufsrecht.` : `By subscribing you agree to the FlipLens Terms (${base}/terms). EU consumers have a 14-day right of withdrawal.`}` },
          },
          ...(withConsent && { consent_collection: { terms_of_service: 'required' as const } }),
          ...(cfg.automaticTax && { automatic_tax: { enabled: true }, customer_update: { address: 'auto' as const }, billing_address_collection: 'required' as const }),
          success_url: `${base}/?billing=success`,
          cancel_url: `${base}/?billing=cancel`,
        });
        let session: Stripe.Checkout.Session;
        try {
          session = await stripe.checkout.sessions.create(params(cfg.requireTermsConsent));
        } catch (e) {
          // No Terms URL in the Stripe dashboard (Settings > Public details): Stripe refuses the consent checkbox.
          // Do not block payments over that; the Terms notice above the button still shows. Fix the dashboard.
          if (!(cfg.requireTermsConsent && e instanceof Stripe.errors.StripeInvalidRequestError && /terms of service/i.test(e.message))) throw e;
          req.log.error({ event: 'stripe_terms_url_missing' }, 'Set the Terms of service URL in Stripe > Settings > Public details');
          session = await stripe.checkout.sessions.create(params(false));
        }
        req.log.info({ event: 'checkout_started', plan: body.data.plan }, 'checkout started');
        return { url: session.url };
      });

      // Back from Checkout: read the subscription straight from Stripe, so the plan does not depend on the webhook
      // alone (delayed, misconfigured). Only the caller's own Stripe customer is looked at.
      app.post('/api/billing/sync', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        if (!stripe) return reply.code(503).send({ error: 'billing_disabled' });
        const user = await getUser(db, uid);
        const customerId = await existingCustomer(stripe, user?.stripeCustomerId);
        if (!customerId) return { synced: false };
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 5 });
        const latest = subs.data.sort((a, b) => b.created - a.created)[0];
        if (!latest) return { synced: false };
        await syncSubscription(latest);
        return { synced: true };
      });

      app.post('/api/billing/portal', async (req, reply) => {
        const uid = await requireUser(req, reply);
        if (!uid) return;
        if (!stripe) return reply.code(503).send({ error: 'billing_disabled' });
        const user = await getUser(db, uid);
        const customerId = await existingCustomer(stripe, user?.stripeCustomerId);
        if (!customerId) return reply.code(400).send({ error: 'no_customer', message: 'No subscription yet' });
        const locale = LOCALE.safeParse((req.body as { locale?: unknown } | undefined)?.locale);
        const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${publicUrl(req)}/`, ...(locale.success && { locale: locale.data }) });
        return { url: session.url };
      });

      // Webhook needs the raw body for signature verification: own JSON parser in an encapsulated scope.
      void app.register(async (scope) => {
        scope.removeContentTypeParser('application/json');
        scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
        scope.post('/api/stripe/webhook', async (req, reply) => {
          if (!stripe || !cfg.webhookSecret) return reply.code(503).send({ error: 'webhook_not_configured' });
          const sig = req.headers['stripe-signature'];
          let event: Stripe.Event;
          try {
            event = stripe.webhooks.constructEvent(req.body as Buffer, typeof sig === 'string' ? sig : '', cfg.webhookSecret);
          } catch (e) {
            req.log.warn({ event: 'stripe_webhook_rejected', err: e instanceof Error ? e.message : String(e) }, 'bad webhook signature');
            return reply.code(400).send({ error: 'bad_signature' });
          }
          switch (event.type) {
            case 'checkout.session.completed': {
              const s = event.data.object;
              if (typeof s.subscription === 'string') await syncSubscription(await stripe.subscriptions.retrieve(s.subscription));
              break;
            }
            case 'invoice.paid':
              await creditReferral(event.data.object);
              break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
              // Re-read in our API version: webhook payloads follow the endpoint's (possibly older) version, where fields
              // such as current_period_end live elsewhere.
              await syncSubscription(await stripe.subscriptions.retrieve(event.data.object.id));
              break;
            default:
              break;
          }
          return { received: true };
        });
      });
    },
  };
}
