# Roadmap

Each phase ends with a gate. The next phase starts only if the gate is passed. Timelines are approximate, for one developer working with an AI agent.

```text
Phase 0  Feasibility research        2-3 weeks    GATE: is the data usable?
Phase 1  Data prototype (backend)    2 weeks      GATE: is POST /valuation useful?
Phase 2  Recognition prototype       2 weeks      GATE: >80% identification?
Phase 3  Profit engine + presets     1 week       GATE: end-to-end API ready
Phase 4  Liquidity                   only if the data allows (non-blocking)
Phase 5  Mobile MVP (Expo)           3-4 weeks
Phase 6  Private beta (20-30)        4-6 weeks    GATE: scans/active user/week
Phase 7  Monetization                after beta signal
Phase 8  Inventory                   after beta (may ship earlier behind a feature flag)
Phase 9  Listing generator           after inventory
```

---

## Phase 0: Feasibility research

Goal: prove or disprove that we can get quality comparables and identify products.

### 0.1 Data source research
- For each source in [DATA_SOURCES.md](DATA_SOURCES.md), fill in the matrix: API, sold data, ToS, rate limits, commercial usage, redistribution.
- Register an eBay developer account, get keys (sandbox + production).
- Apply for the eBay Marketplace Insights API (sold data, restricted access).
- Result: a ranked list of sources, with 1-2 chosen for the MVP.

### 0.2 Test dataset
- 100 real products: 30 electronics, 25 gaming, 25 cameras/lenses, 20 tools.
- For each: 1-3 photos, exact identity, EAN if available, condition, hypothetical purchase price, known market range (manual), source URLs.
- Format: `eval/dataset/items.jsonl` + `eval/dataset/images/`.
- Photos: our own items, friends' items, real photos from charity shops (with permission). Do not use manufacturer stock photos, they inflate accuracy.

### 0.3 Spike: comparable retrieval
- Script: for each product in the dataset, query the eBay Browse API (EBAY_DE, EBAY_FR, EBAY_IT, EBAY_ES, EBAY_GB, EBAY_NL...).
- Apply a draft bad-comparables filter.
- Measure: how many relevant comparables per product, filter precision (manual labeling of a sample).

### 0.4 Spike: identification
- Run photos through a vision model (OpenAI) with structured output.
- Run EAN through eBay Browse `gtin` + 1-2 barcode DBs.
- Measure exact / near-exact / wrong by category.

### 0.5 Spike: pricing usefulness
- Draft pricing (median/p25/p75 after filters) against the known market range.
- Measure the share of estimates with error > ±50%.

### Gate Phase 0

| Metric | Threshold |
|---|---|
| Identification accuracy Tier 1 (exact or near-exact) | > 80% |
| Products with >= 5 relevant comparables | > 70% |
| Estimates with error > ±50% | < 10% |
| At least 1 source legally usable for commercial use | yes |

If the gate is not passed: do not move to mobile. Fix the data layer first (other sources, licensed feeds, narrower categories).

Deliverable: `docs/PHASE0_REPORT.md` with numbers and a go/no-go decision.

---

## Phase 1: Data prototype

Backend-only. No UI.

- Monorepo (pnpm workspaces), `packages/core`, `packages/db`, `packages/sources`, `apps/api`.
- PostgreSQL schema (Drizzle) for core entities: products, product_variants, marketplaces, marketplace_listings, price_snapshots, valuations, valuation_comparables, fx_rates.
- eBay source adapter + result cache (do not hit the API on every request).
- Normalization: title parsing, variant matching, bad comparable filter with exclusion_reason.
- FX: ECB daily reference rates, store original + EUR + fx timestamp.
- Pricing engine v1 (statistics, see PLAN.md), confidence, algorithm_version.
- `POST /valuation` per the contract in PLAN.md.
- Unit tests for core (pricing, filter, profit) with fixtures.
- Eval script: run 100 products through `/valuation`, produce a report.

Gate: eval shows the same or better numbers than the Phase 0 spike, with a stable API.

---

## Phase 2: Recognition prototype

- `POST /identify` (photo): vision model, structured output, top-N candidates with confidence.
- `POST /identify` (barcode): GTIN lookup, fallback chain.
- Canonical product matching: the vision result is mapped to `product_variants` instead of remaining free text.
- Logging corrections (`product_identifications`).
- `eval/scripts/identify.ts`: repeatable run, confusion by category, confidence calibration.

Gate: > 80% exact/near-exact for Tier 1. Confidence is calibrated (at confidence >= 0.85, accuracy >= 90%).

---

## Phase 3: Profit engine

- `marketplace_fee_profiles` (versioned, with source and last_verified_at).
- Scenario presets: eBay, Vinted, Local pickup.
- User settings: country, currency, default marketplace, shipping default, packaging cost.
- Decision engine (rules, transparent factors).
- API: `POST /scans`, `POST /scans/:id/valuation`, `GET /scans` (history).

Gate: full flow through the API: identify, confirm, price, valuation, decision. Everything covered by tests.

---

## Phase 4: Liquidity

Only if real data is available (sold count, days on market).

- Periodic re-fetch of tracked listings, recording `last_seen_at`, disappearance as a proxy for a sale (with caveats).
- Metrics: comparable_count, new_listings_30d, sold_count_30d, median_days_on_market, sell_through_rate.
- If there is no data: the UI shows "Liquidity data unavailable". No made-up numbers.

Does not block Phase 5.

---

## Phase 5: Mobile MVP

- Expo + TypeScript, expo-camera (photo + barcode scanning).
- Screens: Scan, Recognition (Correct / Edit), Purchase Price, Result, Comparables, History, Profile.
- Auth (email magic link or Apple/Google sign-in).
- Image upload to S3-compatible storage (Cloudflare R2), retention policy (for example, 30 days).
- Performance target: camera open to result <= 4 taps, <= 8 seconds on a good network.
- Analytics events for beta metrics.

---

## Phase 6: Private beta

- 20-30 real European resellers (Reddit, Discord, eBay/Vinted communities, flea market groups). Not just friends.
- Metrics: scans per active user per week (primary), scan completion rate, correction rate, comparables opened, items marked bought, D7/D30 retention.
- Strong signal: 30-100 scans/week per user, usage during a sourcing trip.

Gate: >= 30% of beta users make >= 20 scans/week after 4 weeks.

---

## Phase 7: Monetization

- Free: 5-10 scans/month. Pro ~€9.99. Reseller ~€19.99. Prices are a hypothesis.
- RevenueCat on top of App Store / Play subscriptions. Stripe for web later.

## Phase 8: Inventory

- "I BOUGHT IT" creates an inventory item. Statuses: bought, ready_to_list, listed, sold, returned, discarded.
- Dashboard: items, invested, expected revenue, expected profit. Later realized profit, turnover.

## Phase 9: Listing generator

- Title, description, specs, condition text, suggested price, keywords tailored to the marketplace style.
- Only copy title, copy description, share images, open marketplace. No auto-posting through unofficial endpoints.

## Phase 10: Actual sales

- The user enters sold_price, marketplace, fees, shipping, sale_date.
- We compute actual_profit, actual_roi, days_to_sell.
- Every sale adds to our own dataset (predicted vs actual). This is the main long-term moat.
- Predicted vs actual is used to calibrate pricing (asking_to_sold_ratio, condition multipliers).

## Phase 11: Personal sourcing intelligence

- ROI and selling time by the user's categories.
- "You perform better with gaming products than cameras."
- Personal max buy price: market resale, your typical fees, your target ROI.

## Later (only after validation)

- Opportunity discovery (a listing 35% below the estimate).
- Public SEO price pages.
- Cross-border sale suggestions.
- Tier 2 categories: power tools, LEGO, watches, PC components, audio, networking, drones. Fashion last.

---

## Deliverables

1. **Feasibility Report** (`docs/FEASIBILITY_REPORT.md`): sources, APIs, limitations, sold vs active, cost, categories, benchmark, risks, recommended data stack, GO/NO-GO.
2. **CLI/backend prototype**: `evaluate "Sony WH-1000XM4" --condition good --buy-price 55`.
3. **Photo recognition prototype**: `photo.jpg` to a JSON identity with confidence.
4. **Mobile alpha**: Scan, confirm, price, valuation. No more than that.
5. **Private beta**: 20-30 users.

## Report after each phase

1. What was done. 2. Problems found. 3. Objective results (numbers). 4. Updated risks. 5. Next step.
