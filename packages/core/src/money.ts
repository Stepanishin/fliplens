export const CURRENCIES = [
  'EUR', 'GBP', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK', 'RON', 'ISK', 'USD',
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

/** Money is always stored as an integer amount of minor units (ADR-007). */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/** ISO 4217 minor unit exponents. */
const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = {
  EUR: 2, GBP: 2, CHF: 2, PLN: 2, CZK: 2, HUF: 2, SEK: 2, DKK: 2, NOK: 2, RON: 2, ISK: 0, USD: 2,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function money(amountMajor: number, currency: CurrencyCode): Money {
  return { amountMinor: Math.round(amountMajor * 10 ** MINOR_UNIT_EXPONENT[currency]), currency };
}

export function toMajor(m: Money): number {
  return m.amountMinor / 10 ** MINOR_UNIT_EXPONENT[m.currency];
}

export function formatMoney(m: Money, locale = 'en-IE'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }).format(toMajor(m));
}

/**
 * FX rates in ECB convention: units of `quote` per 1 EUR, for a given reference date.
 * EUR itself is implicitly 1.
 */
export interface FxRateTable {
  readonly rateDate: string; // YYYY-MM-DD
  readonly source: string; // e.g. 'ecb'
  readonly perEur: Partial<Record<CurrencyCode, number>>;
}

export interface ConversionResult {
  readonly amount: Money;
  readonly rate: number; // units of target per 1 unit of source
  readonly rateDate: string;
  readonly source: string;
}

export class MissingFxRateError extends Error {
  constructor(readonly currency: CurrencyCode, readonly rateDate: string) {
    super(`No FX rate for ${currency} on ${rateDate}`);
    this.name = 'MissingFxRateError';
  }
}

function perEur(table: FxRateTable, currency: CurrencyCode): number {
  if (currency === 'EUR') return 1;
  const rate = table.perEur[currency];
  if (rate === undefined || !(rate > 0)) throw new MissingFxRateError(currency, table.rateDate);
  return rate;
}

/** Pure conversion using a rate table. Picking the right table for a timestamp is the caller's job. */
export function convert(amount: Money, to: CurrencyCode, table: FxRateTable): ConversionResult {
  const rate = perEur(table, to) / perEur(table, amount.currency);
  const major = toMajor(amount) * rate;
  return { amount: money(major, to), rate, rateDate: table.rateDate, source: table.source };
}
