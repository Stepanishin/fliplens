/**
 * Subscription plans (spec section 48). Prices and limits are a hypothesis: change them here, then re-run the
 * Stripe setup script (it creates new Stripe prices, old subscribers keep theirs).
 */

export type PlanId = 'free' | 'pro' | 'reseller';

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  /** Monthly price in EUR cents; 0 for free. */
  readonly priceMonthlyMinor: number;
  /** Valuations per calendar month. */
  readonly monthlyValuations: number;
  readonly features: readonly string[];
  /**
   * AI spend per user per month (USD millionths) before recognition drops to the cheap model only. At 2x the budget
   * AI features stop until next month. Keeps the worst case user profitable (see docs/DECISIONS.md ADR-015).
   */
  readonly aiBudgetMicroUsd: number;
  /** Stripe price lookup key (created by apps/api/scripts/stripe-setup.ts). */
  readonly stripeLookupKey?: string;
}

export const PLANS: Readonly<Record<PlanId, Plan>> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthlyMinor: 0,
    monthlyValuations: 10,
    aiBudgetMicroUsd: 300_000,
    features: ['10 checks per month', 'Photo and barcode recognition', 'Resale range, profit, ROI and stock tracking'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthlyMinor: 999,
    monthlyValuations: 100,
    aiBudgetMicroUsd: 3_000_000,
    features: ['100 checks per month', 'Stock tracking with real profit', 'Listing generator for eBay, Vinted, Kleinanzeigen'],
    stripeLookupKey: 'fliplens_pro_monthly_v1',
  },
  reseller: {
    id: 'reseller',
    name: 'Reseller',
    priceMonthlyMinor: 1999,
    // "Unlimited" with a fair-use cap: variable cost per check must stay far below the price (spec section 63).
    monthlyValuations: 1000,
    aiBudgetMicroUsd: 6_000_000,
    features: ['Unlimited checks (fair use 1,000/month)', 'Everything in Pro', 'Priority support and new features first'],
    stripeLookupKey: 'fliplens_reseller_monthly_v1',
  },
};

export type PaidPlanId = Exclude<PlanId, 'free'>;
export const PAID_PLANS: readonly PaidPlanId[] = ['pro', 'reseller'];

export function planByLookupKey(key: string | null | undefined): PaidPlanId | undefined {
  return PAID_PLANS.find((p) => PLANS[p].stripeLookupKey === key);
}
