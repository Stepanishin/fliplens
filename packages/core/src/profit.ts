import type { CurrencyCode, Money } from './money.js';

/**
 * Fee profile for one marketplace / country / seller type, valid for a date range.
 * Stored versioned in `marketplace_fee_profiles`; these objects are what core receives.
 */
export interface FeeProfile {
  readonly id: string;
  readonly marketplace: string;
  readonly country?: string;
  readonly sellerType: 'private' | 'business';
  /** Final value fee, basis points of the total sale (item + shipping charged). 1000 = 10%. */
  readonly percentageFeeBp: number;
  readonly fixedFeeMinor: number;
  readonly paymentFeeBp: number;
  readonly paymentFixedFeeMinor: number;
  readonly currency: CurrencyCode;
  /** True if the seller pays the carrier (buyer pays the seller for shipping inside the sale price). */
  readonly sellerPaysShipping: boolean;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly sourceUrl?: string;
  readonly lastVerifiedAt?: string;
}

export interface ProfitInput {
  /** Total buyer price (item + shipping), same basis as comparables. */
  readonly salePrice: Money;
  readonly purchasePrice: Money;
  readonly fees: FeeProfile;
  readonly shippingCost: Money;
  readonly packagingCost?: Money;
}

export interface ProfitBreakdown {
  readonly salePrice: Money;
  readonly marketplaceFee: Money;
  readonly paymentFee: Money;
  readonly shipping: Money;
  readonly packaging: Money;
  readonly net: Money;
  readonly purchasePrice: Money;
  readonly profit: Money;
  /** null when purchase price is 0. */
  readonly roiPct: number | null;
}

export class CurrencyMismatchError extends Error {
  constructor(expected: CurrencyCode, got: CurrencyCode, field: string) {
    super(`${field}: expected ${expected}, got ${got}`);
    this.name = 'CurrencyMismatchError';
  }
}

const bp = (amountMinor: number, basisPoints: number): number => Math.round((amountMinor * basisPoints) / 10_000);

export function computeProfit(i: ProfitInput): ProfitBreakdown {
  const currency = i.salePrice.currency;
  const check = (m: Money, field: string): number => {
    if (m.currency !== currency) throw new CurrencyMismatchError(currency, m.currency, field);
    return m.amountMinor;
  };
  if (i.fees.currency !== currency) throw new CurrencyMismatchError(currency, i.fees.currency, 'fees');

  const sale = i.salePrice.amountMinor;
  const purchase = check(i.purchasePrice, 'purchasePrice');
  const shipping = i.fees.sellerPaysShipping ? check(i.shippingCost, 'shippingCost') : 0;
  const packaging = i.packagingCost ? check(i.packagingCost, 'packagingCost') : 0;
  const marketplaceFee = sale > 0 ? bp(sale, i.fees.percentageFeeBp) + i.fees.fixedFeeMinor : 0;
  const paymentFee = sale > 0 ? bp(sale, i.fees.paymentFeeBp) + i.fees.paymentFixedFeeMinor : 0;
  const net = sale - marketplaceFee - paymentFee - shipping - packaging;
  const profit = net - purchase;

  const m = (amountMinor: number): Money => ({ amountMinor, currency });
  return {
    salePrice: i.salePrice,
    marketplaceFee: m(marketplaceFee),
    paymentFee: m(paymentFee),
    shipping: m(shipping),
    packaging: m(packaging),
    net: m(net),
    purchasePrice: i.purchasePrice,
    profit: m(profit),
    roiPct: purchase > 0 ? Math.round((profit / purchase) * 1000) / 10 : null,
  };
}

/** Highest purchase price that still reaches `targetRoiPct` on the given net. */
export function maxBuyPrice(net: Money, targetRoiPct: number): Money {
  const amountMinor = Math.max(0, Math.floor(net.amountMinor / (1 + targetRoiPct / 100)));
  return { amountMinor, currency: net.currency };
}
