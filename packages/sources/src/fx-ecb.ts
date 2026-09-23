import { isCurrencyCode, type CurrencyCode, type FxRateTable } from '@fliplens/core';

/**
 * ECB euro reference rates (daily, free, "for information purposes only", fine for estimates).
 * Cached in memory; refreshed at most every 6 hours.
 */
const ECB_DAILY = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const TTL_MS = 6 * 60 * 60 * 1000;

/** Used only when ECB is unreachable. Callers must surface `source: 'fallback-static'` as a warning. */
const FALLBACK: FxRateTable = {
  rateDate: '2026-09-22',
  source: 'fallback-static',
  perEur: { GBP: 0.86, CHF: 0.94, PLN: 4.27, CZK: 24.6, HUF: 392, SEK: 11.1, DKK: 7.46, NOK: 11.6, RON: 5.07, ISK: 145, USD: 1.1 },
};

export class EcbFxService {
  private cached?: { at: number; table: FxRateTable };

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async latest(): Promise<FxRateTable> {
    if (this.cached && Date.now() - this.cached.at < TTL_MS) return this.cached.table;
    try {
      const res = await this.fetchImpl(ECB_DAILY);
      if (!res.ok) throw new Error(`ECB HTTP ${res.status}`);
      const table = parseEcbXml(await res.text());
      this.cached = { at: Date.now(), table };
      return table;
    } catch {
      return this.cached?.table ?? FALLBACK;
    }
  }
}

export function parseEcbXml(xml: string): FxRateTable {
  const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  if (!date) throw new Error('ECB XML: no date');
  const perEur: Partial<Record<CurrencyCode, number>> = {};
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g)) {
    const code = m[1]!;
    if (isCurrencyCode(code)) perEur[code] = Number(m[2]);
  }
  return { rateDate: date, source: 'ecb', perEur };
}
