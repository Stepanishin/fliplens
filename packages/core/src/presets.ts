import type { FeeProfile } from './profit.js';
import { convert, type CurrencyCode, type FxRateTable } from './money.js';
import type { CategorySlug, Condition } from './types.js';

/**
 * Selling scenarios ("Sell on ...") and their fee profiles, versioned by effective date.
 * A preset resolves to a concrete FeeProfile per item, because some marketplaces charge by category and condition.
 * Each profile id carries its version (`@effective-date`), and valuations store the id they used.
 * Checked 2026-09-28; re-check when a marketplace announces fee changes and add a new version instead of editing.
 */

type SourceQuality = 'official' | 'secondary';

export interface FeePreset {
  readonly label: string;
  readonly note: string;
  readonly sourceUrl: string;
  readonly sourceQuality: SourceQuality;
  readonly lastVerifiedAt: string;
  resolve(condition: Condition, category: CategorySlug): FeeProfile;
}

const base = {
  paymentFeeBp: 0,
  paymentFixedFeeMinor: 0,
  currency: 'EUR',
} as const;

/** eBay.de categories that get the device rate (5% used / 7% new since 2026-07-01). */
const EBAY_DEVICE_CATEGORIES: ReadonlySet<CategorySlug> = new Set([
  'headphones', 'smartphones', 'tablets', 'laptops', 'smartwatches', 'speakers', 'routers', 'streaming',
  'consoles', 'handhelds', 'games', 'camera_bodies', 'lenses', 'action_cameras', 'compact_cameras',
]);

const EBAY_DE_BUSINESS_URL = 'https://onlinemarktplatz.de/267961/neue-ebay-gebuehren-fuer-gewebliche-verkaeufer-ab-1-juli-2026/';

export const FEE_PRESETS = {
  ebay_de_private: {
    label: 'eBay.de (private seller)',
    note: 'No selling fees for private sellers within Germany (since 2023-03-01). International options can cost extra.',
    sourceUrl: 'https://www.ebay.de/help/selling/fees-credits-invoices/gebhren-fr-private-verkufer-die-der-zahlungsabwicklung-teilnehmen?id=4822',
    sourceQuality: 'official',
    lastVerifiedAt: '2026-09-28',
    resolve: () => ({
      ...base,
      id: 'ebay_de_private@2023-03-01',
      marketplace: 'EBAY_DE',
      country: 'DE',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: true,
      effectiveFrom: '2023-03-01',
    }),
  },
  ebay_de_business: {
    label: 'eBay.de (business seller)',
    note: 'Since 2026-07-01: used/refurbished electronics 5%, new 7%, accessories 12%, tools 13%, plus €0.45 per order over €10. Rates for games, accessories and tools are less certain.',
    sourceUrl: EBAY_DE_BUSINESS_URL,
    sourceQuality: 'secondary',
    lastVerifiedAt: '2026-09-28',
    resolve: (condition, category) => {
      const used = condition !== 'new';
      let bp: number;
      let kind: string;
      if (category === 'controllers') {
        bp = used ? 500 : 1200;
        kind = used ? 'used-accessory' : 'new-accessory';
      } else if (category === 'power_tools') {
        bp = 1300;
        kind = 'tools';
      } else if (EBAY_DEVICE_CATEGORIES.has(category)) {
        bp = used ? 500 : 700;
        kind = used ? 'used-device' : 'new-device';
      } else {
        bp = 1200;
        kind = 'other';
      }
      return {
        ...base,
        id: `ebay_de_business@2026-07-01/${kind}`,
        marketplace: 'EBAY_DE',
        country: 'DE',
        sellerType: 'business',
        percentageFeeBp: bp,
        // €0.35 for orders up to €10, €0.45 above: resale items are practically always above €10.
        fixedFeeMinor: 45,
        sellerPaysShipping: true,
        effectiveFrom: '2026-07-01',
        sourceUrl: EBAY_DE_BUSINESS_URL,
        lastVerifiedAt: '2026-09-28',
      };
    },
  },
  ebay_uk_private: {
    label: 'eBay.co.uk (private seller)',
    note: 'No final value fee or regulatory fee for UK-based private sellers (vehicles excepted); 300 free listings a month. Upgrades and international delivery can cost extra.',
    sourceUrl: 'https://www.ebay.co.uk/help/selling/fees-credits-invoices/selling-fees?id=4822',
    sourceQuality: 'official',
    lastVerifiedAt: '2026-10-12',
    resolve: () => ({
      ...base,
      currency: 'GBP',
      id: 'ebay_uk_private@2026-10-12',
      marketplace: 'EBAY_GB',
      country: 'GB',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: true,
      effectiveFrom: '2026-10-12',
    }),
  },
  ebay_it_private: {
    label: 'eBay.it (private seller)',
    note: 'No selling fees for private sellers based in the EEA since 2026-09-01; the buyer pays a purchase protection fee. Optional upgrades and shipping outside the eurozone can cost extra.',
    sourceUrl: 'https://www.ebay.it/help/selling/fees-credits-invoices/servizi-di-pagamento-tariffe-per-venditori-non-professionali?id=4822',
    sourceQuality: 'official',
    lastVerifiedAt: '2026-10-12',
    resolve: () => ({
      ...base,
      id: 'ebay_it_private@2026-09-01',
      marketplace: 'EBAY_IT',
      country: 'IT',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: true,
      effectiveFrom: '2026-09-01',
    }),
  },
  ebay_fr_private: {
    label: 'eBay.fr (private seller)',
    note: 'No selling fees for private sellers based in the EEA since 2026-09-01 (up to 150 listings a month, then €0.35 each); the buyer pays a protection fee. Shipping outside the eurozone can cost extra.',
    sourceUrl: 'https://www.ebayinc.com/stories/press-room/fr/ebay-supprime-les-frais-de-vente/',
    sourceQuality: 'official',
    lastVerifiedAt: '2026-10-12',
    resolve: () => ({
      ...base,
      id: 'ebay_fr_private@2026-09-01',
      marketplace: 'EBAY_FR',
      country: 'FR',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: true,
      effectiveFrom: '2026-09-01',
    }),
  },
  vinted: {
    label: 'Vinted',
    note: 'No seller fees. The buyer pays Buyer Protection (about 5% + €0.70, up to 8% for electronics) and shipping on top.',
    sourceUrl: 'https://www.vintagelab.org/blog/vinted-gebuehren',
    sourceQuality: 'secondary',
    lastVerifiedAt: '2026-09-28',
    resolve: () => ({
      ...base,
      id: 'vinted@2026-01-01',
      marketplace: 'VINTED',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: false,
      effectiveFrom: '2026-01-01',
    }),
  },
  local_pickup: {
    label: 'Local pickup / cash',
    note: 'No fees, no shipping.',
    sourceUrl: '',
    sourceQuality: 'official',
    lastVerifiedAt: '2026-09-28',
    resolve: () => ({
      ...base,
      id: 'local_pickup@1',
      marketplace: 'LOCAL',
      sellerType: 'private',
      percentageFeeBp: 0,
      fixedFeeMinor: 0,
      sellerPaysShipping: false,
      effectiveFrom: '2026-01-01',
    }),
  },
} as const satisfies Record<string, FeePreset>;

export type FeePresetId = keyof typeof FEE_PRESETS;

export function resolveFeeProfile(preset: FeePresetId, condition: Condition, category: CategorySlug): FeeProfile {
  return FEE_PRESETS[preset].resolve(condition, category);
}

/** All fee presets, the ones for the user's country first (the first one is the default for that country). */
export function presetsForCountry(country: string): FeePresetId[] {
  const own: Partial<Record<string, FeePresetId[]>> = {
    GB: ['ebay_uk_private'],
    DE: ['ebay_de_private', 'ebay_de_business'],
    AT: ['ebay_de_private', 'ebay_de_business'],
    IT: ['ebay_it_private'],
    FR: ['ebay_fr_private'],
    BE: ['ebay_fr_private'],
  };
  const first = own[country] ?? ['ebay_de_private', 'ebay_de_business'];
  const order: FeePresetId[] = [...first, 'vinted', 'local_pickup', 'ebay_de_private', 'ebay_de_business', 'ebay_it_private', 'ebay_fr_private', 'ebay_uk_private'];
  return [...new Set(order)];
}

/**
 * Marketplace data and money. Where the user sells decides: the eBay.co.uk preset means UK listings in pounds, the
 * eBay.de presets mean the five EU eBay sites in euro, whatever the country. Vinted and local pickup follow the
 * country (United Kingdom: eBay.co.uk in pounds).
 */
export function marketFor(country: string | undefined, preset?: string): { sites: readonly string[] | undefined; currency: 'GBP' | 'EUR' } {
  const uk = preset === 'ebay_uk_private' || (!preset?.startsWith('ebay_') && country === 'GB');
  return uk ? { sites: ['EBAY_GB'], currency: 'GBP' } : { sites: undefined, currency: 'EUR' };
}

/** A fee profile expressed in another currency (fixed fees converted; percentages unchanged). */
export function feeProfileIn(profile: FeeProfile, currency: CurrencyCode, fx: FxRateTable): FeeProfile {
  if (profile.currency === currency) return profile;
  const conv = (minor: number) => (minor === 0 ? 0 : convert({ amountMinor: minor, currency: profile.currency }, currency, fx).amount.amountMinor);
  return { ...profile, currency, fixedFeeMinor: conv(profile.fixedFeeMinor), paymentFixedFeeMinor: conv(profile.paymentFixedFeeMinor) };
}
