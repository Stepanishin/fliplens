/**
 * Creates the Stripe products/prices for the paid plans (idempotent: looks prices up by lookup_key).
 *   pnpm --filter @fliplens/api stripe:setup
 * Uses STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY); refuses a live key unless STRIPE_ALLOW_LIVE=1.
 */
import Stripe from 'stripe';
import { PAID_PLANS, PLANS } from '@fliplens/core';

const key = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error('No Stripe key in .env');
if (key.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE !== '1') throw new Error('Refusing to touch LIVE Stripe without STRIPE_ALLOW_LIVE=1');
const stripe = new Stripe(key);
console.log(`Stripe mode: ${key.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);

for (const id of PAID_PLANS) {
  const plan = PLANS[id];
  const lookup = plan.stripeLookupKey!;
  const existing = await stripe.prices.list({ lookup_keys: [lookup], limit: 1 });
  if (existing.data[0]) {
    console.log(`${plan.name}: price exists (${existing.data[0].id}, ${lookup})`);
    continue;
  }
  const product = await stripe.products.create({ name: `FlipLens ${plan.name}`, description: plan.features.join(' · '), metadata: { plan: id } });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: plan.priceMonthlyMinor,
    recurring: { interval: 'month' },
    lookup_key: lookup,
    tax_behavior: 'inclusive',
    metadata: { plan: id },
  });
  console.log(`${plan.name}: created ${product.id} / ${price.id} (€${plan.priceMonthlyMinor / 100}/month, ${lookup})`);
}
