# Technical Plan

Codename: **FlipLens** (working title, does not block development).

Main principle: **Validate the data before building the product.**

Development order (do not change):

```text
DATA > VALUATION > RECOGNITION > PROFIT > MOBILE > BETA > PAYMENT > INVENTORY > LISTINGS
```

Filters for every feature:
- Does it help decide "buy or skip"? If not, it is not a priority.
- Do we need this complexity now? If not, defer it.
- Do we have the right to use this data? If unknown, research first.
- Can it be solved cheaper: cache, deterministic code, no AI call?

---

## 1. Architecture

```text
                 ┌──────────────┐
  photo/barcode  │  apps/mobile │  (Phase 5)
  ─────────────▶ │  Expo + TS   │
                 └──────┬───────┘
                        │ HTTPS/JSON
                 ┌──────▼───────┐        ┌───────────────────┐
  CLI (Phase 1) ▶│   apps/api   │───────▶│ packages/recognition│ VisionProvider, BarcodeProvider
                 │   Fastify    │        └───────────────────┘
                 └──────┬───────┘        ┌───────────────────┐
                        ├───────────────▶│ packages/sources  │ MarketplaceAdapter (eBay, ...)
                        │                └───────────────────┘
                        │                ┌───────────────────┐
                        ├───────────────▶│ packages/core     │ normalize, filter, pricing,
                        │                │ (pure, no I/O)    │ confidence, profit, decision
                        │                └───────────────────┘
                 ┌──────▼───────┐        ┌───────────────────┐
                 │ PostgreSQL   │        │ R2 (images)       │ retention policy
                 │ (Drizzle)    │        └───────────────────┘
                 └──────────────┘
```

Layers:
- `packages/core`: pure functions. Input: normalized product + normalized comparables + settings. Output: valuation. No marketplace-specific code.
- `packages/sources`: adapters. Each returns `MarketplaceItem` in a common format.
- `packages/recognition`: abstraction over the vision/LLM provider and barcode lookup.
- `packages/db`: Drizzle schema, migrations, repositories.
- `apps/api`: HTTP, auth, orchestration, cache, cost tracking, logging.
- `apps/cli`: `evaluate "Sony WH-1000XM4" --condition good --buy-price 55` (second deliverable).
- `eval/`: benchmark dataset and regression scripts.

## 2. Stack

| Layer | Choice | Why (see DECISIONS.md) |
|---|---|---|
| Language | TypeScript strict, no `any` | typed, single codebase |
| Monorepo | pnpm workspaces | ADR-001 |
| API | Fastify + Zod | ADR-002 |
| ORM | Drizzle | ADR-003 |
| DB | PostgreSQL | local Homebrew 14, managed in prod |
| Queue | none; pg-boss later; Redis/BullMQ only under load | ADR-005 |
| Images | Cloudflare R2 (S3 API, no egress fees) | retention policy |
| Vision | OpenAI Responses API (`gpt-6-sol`), strict structured output, behind the `VisionProvider` interface | ADR-006 |
| Mobile | Expo + React Native + TS, expo-camera | Phase 5 |
| Tests | Vitest | fast, TS native |
| Logging | pino (built into Fastify), JSON | structured |
| Errors | Sentry (API + mobile) | error tracking |
| Analytics | PostHog (EU cloud) | GDPR, self-hosting possible |
| Billing | RevenueCat, Stripe for web later | Phase 7 |

## 3. Key interfaces

```typescript
type Money = { amountMinor: number; currency: CurrencyCode };

type Condition = 'new' | 'like_new' | 'very_good' | 'good' | 'fair' | 'poor' | 'for_parts';

interface NormalizedProduct {
  category: CategorySlug;
  brand: string;
  family?: string;
  model: string;
  generation?: string;
  variant?: string;
  capacity?: string;      // "128GB", "1TB"
  colour?: string;
  gtin?: string;
  mount?: string;         // cameras/lenses: "RF", "EF", "E"
  attributes?: Record<string, string>;
}

interface MarketplaceItem {
  source: SourceId;              // 'ebay'
  marketplaceSite: string;       // 'EBAY_DE'
  externalId: string;
  url: string;
  title: string;
  price: Money;
  shipping?: Money;
  priceKind: 'asking' | 'sold' | 'buyback' | 'refurbished_retail';
  buyingFormat: 'fixed_price' | 'auction' | 'best_offer' | 'unknown';
  conditionRaw?: string;
  condition?: Condition;
  country?: CountryCode;
  sellerType?: 'private' | 'business' | 'unknown';
  listedAt?: Date;
  soldAt?: Date;
  fetchedAt: Date;
}

interface MarketplaceAdapter {
  readonly id: SourceId;
  readonly capabilities: { sold: boolean; asking: boolean; gtinSearch: boolean };
  searchProduct(query: NormalizedProduct, opts: SearchOptions): Promise<MarketplaceItem[]>;
  getItem?(externalId: string): Promise<MarketplaceItem>;
}

interface VisionProvider {
  readonly id: string;             // 'openai:gpt-6-sol'
  identify(images: ImageInput[]): Promise<IdentificationResult>; // top-N candidates + confidence + usage/cost
}

interface BarcodeProvider {
  lookup(gtin: string): Promise<BarcodeResult | null>;
}

interface CurrencyService {
  convert(amount: Money, to: CurrencyCode, at: Date): Promise<{ amount: Money; rate: number; rateDate: string }>;
}
```

## 4. Pricing engine v1

Pipeline (all in `packages/core`, deterministic):

```text
normalized product
  > fetch comparables (adapters, through cache)
  > match & filter (similarity + exclusion_reason)
  > currency normalize (EUR, ECB rate on the observation date)
  > condition normalize (to the user's condition)
  > outlier removal (IQR / MAD)
  > distribution (count, min, p10, p25, median, p75, p90, max)
  > valuation (fast / expected / high)
  > confidence
```

### Matching and exclusion reasons

Each comparable gets a `similarity_score` (0..1) and either `included=true` or an `exclusion_reason`:

```text
wrong_variant        (XM5 instead of XM4, Lite instead of OLED, 512GB instead of 128GB, EF instead of RF)
wrong_category       (case, cover, ear pads, cable)
accessory_only
box_only / empty_packaging
for_parts / broken / defective
bundle               (console + 5 games)
auction_unknown_final
duplicate            (same seller + title + price, cross-listing)
outlier_low / outlier_high
suspected_scam       (price < 30% of median, new seller, etc.)
stale                (older than the freshness window)
currency_unknown
```

v1 implementation: rule-based (keywords in EN/DE/FR/IT/ES/NL/PL + regex for model/capacity/mount + negative variant tokens). An LLM title classifier only if rules fail on the benchmark, and with caching by title hash.

### Prices

If sold data is available (preferred):
- expected = median sold
- fast = p25 sold
- high = p75 sold

If only asking prices:
- expected = median asking × `asking_to_sold_ratio` (per category, calibrated on the benchmark; starting hypothesis 0.85-0.90)
- fast = p25 asking × ratio
- high = p75 asking (as "high ask", explicitly labeled as asking)
- the UI states explicitly: "Based on N active listings (asking prices), not sold prices"

Buy-back prices (if a source is available) are used as a lower bound: fast is never below buy-back.

### Condition adjustment

1. First compare within the same condition bucket.
2. If the bucket has < 5 observations, take neighboring buckets with multipliers (starting values, to be calibrated):

```text
new 1.00 | like_new 0.90 | very_good 0.82 | good 0.75 | fair 0.62 | poor 0.45 | for_parts 0.25
```

Multipliers are stored as versioned per-category configuration, not hardcoded.

### Confidence

Numeric score 0..1, publicly High (>=0.75) / Medium (>=0.5) / Low.

```text
confidence = identification_conf
           × f(count_included)          5 observations: 0.6, 15: 0.85, 30+: 1.0
           × f(mean_similarity)
           × f(freshness)               median age of observations
           × data_kind_factor           sold 1.0, asking 0.8
           × f(spread)                  (p75 - p25) / median
```

All factors are returned together with the score, so the UI can show "why Medium".

If count_included < 5 or identification_conf < 0.5: no valuation is issued, and the response is `insufficient_data` with suggestions: another photo, enter the model, scan the barcode.

## 5. Profit engine

```text
expected_sale_price
- marketplace_fee   (percentage × (price + shipping charged, if the marketplace counts it that way) + fixed)
- payment_fee
- shipping_cost     (user default, later by weight/country)
- packaging_cost    (optional)
= expected_net
- purchase_price
= expected_profit

ROI = expected_profit / purchase_price × 100
```

Calculated for three prices (fast/expected/high) to show the profit range.

Fee profiles: table `marketplace_fee_profiles`, versioned by `effective_from/effective_until`, with a `source` field (URL) and `last_verified_at`. MVP presets: eBay (DE private seller), Vinted (buyer-pays model, seller fee 0), Local pickup (fee 0, shipping 0).

**Max buy price** for the user's target ROI is also calculated (cheap and immediately useful):

```text
max_buy = expected_net / (1 + target_roi)
```

## 6. Decision engine

Rules, not an opaque score. Versioned configuration:

```text
STRONG BUY : confidence >= medium AND ROI >= 60% AND profit >= €20 AND (liquidity unknown OR >= medium)
BUY        : confidence >= medium AND ROI >= 30% AND profit >= €10
BORDERLINE : ROI >= 10% OR profit >= €5, or low confidence with good numbers
SKIP       : otherwise
```

Low confidence never yields STRONG BUY. The response always contains `factors[]` and `risks[]`.

## 7. Caching and market snapshots

- `market_snapshots`: (variant_id, region, condition_bucket, data_kind) > distribution, sample_size, captured_at, pricing_algorithm_version.
- TTL is set by the source: eBay listings <= 6 hours, eBay-derived snapshots <= 24 hours (eBay license, see DATA_SOURCES.md).
- A scan that hits a fresh snapshot does not call the marketplace API.
- UI: "Market data updated 3 hours ago".
- Raw listings are stored with `first_seen_at/last_seen_at` and `price_snapshots` (price is not overwritten) only within the limits allowed by the source ToS. eBay listings are deleted after they end.
- The comparables screen groups comparables by source; the eBay block is visually separated (no co-mingling).

## 8. Region

- MVP: `EU` (all EU sites of the source) and the user's `country`.
- Later: DE, FR, IT, ES, Benelux, Nordics, CEE.
- Cross-border optimization is not in the MVP.

## 9. Data model

Core tables (Phase 1-3). Money: integer minor units + currency (ADR-007).

```text
users, user_settings(country, currency, default_marketplace, shipping_default, packaging_default, target_roi, locale)
categories
products(id, category_id, brand, family, canonical_name)
product_variants(id, product_id, model, generation, sku, ean, upc, capacity, colour, size, release_year, attributes_json)
product_aliases(variant_id, alias, locale)          search synonyms, including from corrections
product_identifications(scan_id, source[vision|barcode|manual], provider, model_version, candidates_json, chosen_variant_id, confidence, corrected_by_user, correction_json)
marketplaces(id, source, site, country, currency)
marketplace_fee_profiles(marketplace_id, country, seller_type, percentage_fee_bp, fixed_fee_minor, payment_fee_bp, payment_fixed_minor, effective_from, effective_until, source_url, last_verified_at)
marketplace_listings(id, marketplace_id, external_id, url, product_variant_id, title, price_original_minor, currency, price_eur_minor, fx_rate_id, condition, condition_raw, country, listed_at, first_seen_at, last_seen_at, status, seller_type, price_kind)
marketplace_sales(listing_id?, marketplace_id, product_variant_id, price_minor, currency, price_eur_minor, fx_rate_id, sold_at, condition, country)
price_snapshots(listing_id, price_minor, currency, captured_at)
fx_rates(base, quote, rate, rate_date, source)
market_snapshots(variant_id, region, condition, data_kind, count, min, p10, p25, median, p75, p90, max, captured_at, algorithm_version)
scans(id, user_id, recognized_variant_id, purchase_price_minor, purchase_currency, condition, status, created_at)
scan_images(id, scan_id, storage_key, delete_after, deleted_at)
valuations(id, scan_id, fast/expected/high_minor, currency, estimated_fees_minor, estimated_shipping_minor, expected_net_minor, expected_profit_minor, roi_bp, liquidity_score, confidence_score, confidence_factors_json, decision, decision_factors_json, pricing_algorithm_version, recognition_model_version, market_snapshot_id, created_at)
valuation_comparables(valuation_id, listing_id|sale_id, similarity_score, included, exclusion_reason)
usage_costs(scan_id, kind[vision|llm|marketplace_api|storage], provider, units, cost_micro_eur)
inventory_items (Phase 8), transactions (Phase 10), subscriptions (Phase 7)
```

## 10. Versioning

Each valuation stores `pricing_algorithm_version` (semver, e.g. `pricing-1.0.0`) and `recognition_model_version` (`openai:gpt-6-sol@prompt-v1`). History is not recalculated retroactively. Any pricing change must pass benchmark regression before merge.

## 11. Observability

- pino JSON logs, a request id on every request, propagated into adapters and providers.
- Sentry for exceptions.
- Explicit error events: `source_fetch_failed{source,site,status}`, `recognition_failed{provider,reason}`, `valuation_insufficient_data`.
- No silent failures: if an adapter fails, the valuation records it in `warnings[]` and lowers confidence.

## 12. Cost tracking

For every scan we write `usage_costs`: vision tokens × price, marketplace calls, storage. Metric: **cost per successful valuation**. Dashboard (SQL view) by user and by month. Limit: a user's variable cost must stay well below the plan price.

Cost reduction:
- barcode first, vision only if there is no barcode;
- market snapshot cache;
- downscale images to ~1MP before vision;
- cheap model by default, expensive one only on low confidence.

## 13. Analytics

PostHog (EU), events from the spec: scan_started, image_uploaded, barcode_scanned, product_detected, product_corrected, valuation_started, valuation_completed, valuation_failed, comparables_opened, item_marked_bought, subscription_viewed, subscription_started, inventory_added, item_sold. No PII in properties. Opt-in per GDPR/ePrivacy.

## 14. Privacy / GDPR

- Data minimization: no location, no device fingerprint, no contacts.
- Endpoints: export data (JSON), delete account, delete scan, delete images.
- Image retention: photos without an inventory item are deleted 7 days after processing (`scan_images.delete_after`), via a daily job. Photos of an inventory item are kept as long as the item exists. The policy is described in the app.
- Photos are sent to the vision provider only for identification; the provider must have zero data retention / no training on the data.
- EU hosting for DB and storage.

## 15. Error UX

Never return a fake valuation. An `insufficient_data` response contains the reason and actions: `retake_photo`, `enter_model`, `scan_barcode`. Always show source count, data age, confidence, comparables.

## 16. i18n

UI in English, strings through i18n keys from day one (expo-localization + i18next). Normalization dictionaries per language (condition terms, "defekt", "pour pièces", "per ricambi"...).

## 17. Do not build before product-market validation

Social feed, marketplace, chat, shipping, payments for goods, logistics, AI-generated photos, accounting, tax filing, desktop client, web3, gamification, forum, complex referral programs, auto-posting through unofficial endpoints, SEO price pages, opportunity discovery.

AI is not positioned as the product. The user is buying better sourcing decisions.
