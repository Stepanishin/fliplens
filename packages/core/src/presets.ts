import type { FeeProfile } from './profit.js';

/**
 * Scenario presets for Phase 1-3. Seed data for `marketplace_fee_profiles`, not the source of truth.
 * None of these numbers is verified yet (no lastVerifiedAt). Verify against the marketplace fee pages
 * before showing them to users, then set sourceUrl + lastVerifiedAt.
 */
export const FEE_PRESETS = {
  ebay_de_private: {
    id: 'ebay_de_private@2026-01-01',
    marketplace: 'EBAY_DE',
    country: 'DE',
    sellerType: 'private',
    percentageFeeBp: 0, // UNVERIFIED: eBay.de has advertised no selling fees for private sellers
    fixedFeeMinor: 0,
    paymentFeeBp: 0,
    paymentFixedFeeMinor: 0,
    currency: 'EUR',
    sellerPaysShipping: true,
    effectiveFrom: '2026-01-01',
  },
  ebay_de_business: {
    id: 'ebay_de_business@2026-01-01',
    marketplace: 'EBAY_DE',
    country: 'DE',
    sellerType: 'business',
    percentageFeeBp: 1100, // UNVERIFIED placeholder, varies by category
    fixedFeeMinor: 35,
    paymentFeeBp: 0,
    paymentFixedFeeMinor: 0,
    currency: 'EUR',
    sellerPaysShipping: true,
    effectiveFrom: '2026-01-01',
  },
  vinted: {
    id: 'vinted@2026-01-01',
    marketplace: 'VINTED',
    sellerType: 'private',
    percentageFeeBp: 0, // UNVERIFIED: buyer pays the buyer protection fee, seller pays nothing
    fixedFeeMinor: 0,
    paymentFeeBp: 0,
    paymentFixedFeeMinor: 0,
    currency: 'EUR',
    sellerPaysShipping: false,
    effectiveFrom: '2026-01-01',
  },
  local_pickup: {
    id: 'local_pickup@2026-01-01',
    marketplace: 'LOCAL',
    sellerType: 'private',
    percentageFeeBp: 0,
    fixedFeeMinor: 0,
    paymentFeeBp: 0,
    paymentFixedFeeMinor: 0,
    currency: 'EUR',
    sellerPaysShipping: false,
    effectiveFrom: '2026-01-01',
  },
} as const satisfies Record<string, FeeProfile>;

export type FeePresetId = keyof typeof FEE_PRESETS;
