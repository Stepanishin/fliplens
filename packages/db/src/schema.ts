import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Money: integer minor units + ISO currency (ADR-007).
 * eBay listing content (titles, URLs, prices of single listings) is NOT stored: the eBay license requires
 * deleting it once the listing ends, so valuations keep only aggregates (ADR-009).
 */

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** No accounts yet: one row per installation (random device key from the app). Replaced by real auth later. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceKey: text('device_key').notNull().unique(),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productIdentifications = pgTable(
  'product_identifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    method: text('method').$type<'photo' | 'barcode'>().notNull(),
    modelVersion: text('model_version').notNull(),
    gtin: text('gtin'),
    imageCount: integer('image_count').notNull().default(0),
    candidates: jsonb('candidates').notNull(),
    confusableModels: jsonb('confusable_models').$type<string[]>().notNull(),
    conditionGuess: text('condition_guess'),
    identifyingText: jsonb('identifying_text').$type<string[]>().notNull(),
    topConfidence: real('top_confidence'),
    /** Filled when the user runs a valuation: which candidate they took and what they changed. */
    chosenIndex: integer('chosen_index'),
    finalProduct: jsonb('final_product'),
    corrected: boolean('corrected'),
    correction: jsonb('correction'),
    createdAt: createdAt(),
  },
  (t) => [index('product_identifications_user_idx').on(t.userId, t.createdAt)],
);

export const scans = pgTable(
  'scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    identificationId: uuid('identification_id').references(() => productIdentifications.id, { onDelete: 'set null' }),
    inputMethod: text('input_method').$type<'photo' | 'barcode' | 'manual'>().notNull(),
    category: text('category').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    capacity: text('capacity'),
    mount: text('mount'),
    gtin: text('gtin'),
    /** The exact NormalizedProduct used for the valuation (incl. excludeModels). */
    product: jsonb('product').notNull(),
    condition: text('condition').notNull(),
    purchasePriceMinor: integer('purchase_price_minor').notNull(),
    currency: text('currency').notNull(),
    status: text('status').$type<'valued' | 'insufficient_data'>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('scans_user_idx').on(t.userId, t.createdAt)],
);

export const valuations = pgTable(
  'valuations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: uuid('scan_id').notNull().references(() => scans.id, { onDelete: 'cascade' }),
    status: text('status').$type<'ok' | 'insufficient_data'>().notNull(),
    insufficientReason: text('insufficient_reason'),
    dataKind: text('data_kind').$type<'sold' | 'asking'>(),
    currency: text('currency').notNull(),
    fastSaleMinor: integer('fast_sale_minor'),
    expectedSaleMinor: integer('expected_sale_minor'),
    highSaleMinor: integer('high_sale_minor'),
    estimatedFeesMinor: integer('estimated_fees_minor'),
    estimatedShippingMinor: integer('estimated_shipping_minor'),
    expectedNetMinor: integer('expected_net_minor'),
    expectedProfitMinor: integer('expected_profit_minor'),
    /** ROI in basis points (6700 = 67%); null when the purchase price is 0. */
    roiBp: integer('roi_bp'),
    maxBuyMinor: integer('max_buy_minor'),
    confidenceScore: real('confidence_score'),
    confidenceLevel: text('confidence_level'),
    confidenceFactors: jsonb('confidence_factors'),
    decision: text('decision'),
    decisionFactors: jsonb('decision_factors').$type<string[]>(),
    risks: jsonb('risks').$type<string[]>(),
    includedCount: integer('included_count').notNull(),
    fetchedCount: integer('fetched_count').notNull(),
    exclusionCounts: jsonb('exclusion_counts').$type<Record<string, number>>().notNull(),
    distribution: jsonb('distribution'),
    sites: jsonb('sites').$type<Record<string, number>>(),
    feeProfileId: text('fee_profile_id').notNull(),
    fxRateDate: text('fx_rate_date'),
    fxSource: text('fx_source'),
    pricingAlgorithmVersion: text('pricing_algorithm_version').notNull(),
    recognitionModelVersion: text('recognition_model_version'),
    dataFetchedAt: timestamp('data_fetched_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('valuations_scan_idx').on(t.scanId)],
);

/** Approximate variable cost per call: the basis for "cost per successful valuation". */
export const usageCosts = pgTable(
  'usage_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    scanId: uuid('scan_id').references(() => scans.id, { onDelete: 'set null' }),
    identificationId: uuid('identification_id').references(() => productIdentifications.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'vision' | 'text_llm' | 'marketplace_api'>().notNull(),
    provider: text('provider').notNull(),
    model: text('model'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    calls: integer('calls').notNull().default(1),
    /** USD in millionths (1 = $0.000001). */
    costMicroUsd: integer('cost_micro_usd').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('usage_costs_created_idx').on(t.createdAt)],
);
