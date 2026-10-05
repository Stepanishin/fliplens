# Architecture Decision Records

## ADR-001: Monorepo with pnpm workspaces
Status: accepted.
Why: core logic (pricing, normalization) is reused in the API, eval scripts and later partly in mobile. One TypeScript, one set of types. pnpm is already installed, fast and strict.
No Turborepo/Nx at the start: not needed, we will add it if builds become slow.

## ADR-002: Fastify instead of NestJS / Express
Status: accepted.
Why: Fastify is simple, fast, has built-in schema validation and good TS support. NestJS provides DI and modules, but adds ceremony that does not pay off for a backend with a dozen endpoints. Express is outdated in ergonomics (async errors, validation).
Validation: Zod schemas shared between the API and the client.

## ADR-003: Drizzle instead of Prisma
Status: accepted.
Why:
- Pricing and liquidity require analytical SQL queries (percentile_cont, window functions, date aggregates). Drizzle is close to SQL and does not get in the way of writing typed raw queries.
- No separate query engine binary and no codegen step.
- Migrations as SQL files, easy to review.
Downside: smaller ecosystem than Prisma. Acceptable.

## ADR-004: Core as pure functions without I/O
Status: accepted.
Why: pricing, filtering, profit and decision must be deterministic and testable on fixtures. The same input comparables produce the same valuation. This allows versioning the algorithm (`algorithm_version`) and re-checking against the eval dataset.

## ADR-005: No Redis/BullMQ at the start
Status: accepted.
Why: the MVP fits within a synchronous request + a cache in PostgreSQL. If background work is needed (liquidity re-fetch), start with `pg-boss` (a queue on top of Postgres), and use Redis only under real load.

## ADR-006: Vision via OpenAI (Responses API) with structured output
Status: accepted 2026-09-23 (product owner decision: OpenAI instead of Anthropic). To be revisited based on eval results.
Why: a multimodal model reads text on the body/box (model numbers, EAN) and understands generations. Strict Structured Outputs (`text.format: json_schema`) give the top-3 candidates with confidence, confusable models and a condition guess. The model is not used for price estimation: price comes only from market data.
Implementation: `packages/recognition`, the `VisionProvider` interface, the `OpenAIVisionProvider` provider. `store: false`. Model via `OPENAI_VISION_MODEL`, default `gpt-6-sol` ($2/$10 per 1M tokens). Candidate for cost reduction: `gpt-6-luna` ($0.1/$0.5), to be compared on the benchmark.
First measurement (synthetic WH-1000XM4 label): correct, confidence 0.99, 1206 input + 220 output tokens, ~$0.005, 4.1 s.

## ADR-007: Money as integer minor units
Status: accepted.
Why: no floats for money. We store `amount_minor` (cents) + `currency` (ISO 4217). The same approach for CHF/SEK/PLN etc. EUR normalization is stored separately together with fx_rate_id.

## ADR-008: Postgres on Neon (EU, Frankfurt)
Status: accepted 2026-09-28 (replaces the plan with a local Homebrew Postgres).
Why: a free permanent plan without a card, EU region (GDPR), branches for dev and production, plain Postgres (Drizzle + postgres.js, no vendor lock-in). Downside: compute suspends after 5 minutes of idle time, so the first request is slower. Supabase free was rejected: the project is paused after a week of inactivity.
Connection: `DATABASE_URL` (pooled endpoint, `sslmode=require`), `prepare: false` for the pooler. Migrations (`packages/db/migrations`, drizzle-kit) are applied by the API on startup. Without `DATABASE_URL` the API works but persists nothing (health `db: disabled|error`).

## ADR-009: Do not store eBay listing content
Status: accepted 2026-09-28.
Why: the eBay license requires deleting eBay content when a listing is no longer public, and prohibits ML on it. Therefore `valuations` stores only aggregates: price distribution, number of comparables per site, exclusion reason counters, algorithm versions. Individual listings (title, URL, price) are not stored; the `valuation_comparables` table from the original data model is deferred until sources that allow this appear (users' own sales).

## ADR-010: User = device key until accounts exist
Status: accepted 2026-09-28, amended by ADR-011.
Why: registration is not needed for the internal test and closed beta. The app generates a random installation key (`x-device-id`), and the server creates a `users` row for it. GDPR: `GET /api/me/export`, `DELETE /api/me` (cascade deletes everything), `DELETE /api/scans/:id`. Replace with real auth before public beta.

## ADR-011: Google sign-in, device key as session token
Status: accepted 2026-09-28.
How: a Google Identity Services button returns an ID token, the server verifies its signature and `aud` (jose + Google JWKS, `email_verified`), then binds the current device to the account (`users.google_sub`). If the account already exists on another device, this device's anonymous data is merged into it. Devices are stored in `user_devices`; sign-out deletes the device row, and the app creates a new key.
Why this way: no custom passwords and no cookie/CSRF logic; a 128-bit random device key works as a bearer token. Downside: the key in localStorage is exposed to XSS. Consider an httpOnly cookie session before public launch.

## ADR-012: Subscriptions via Stripe Checkout + Customer Portal
Status: accepted 2026-09-28 (product owner decision: monetization before beta).
How: plans in `packages/core/src/plans.ts` (Free 10 / Pro €9.99 100 / Reseller €19.99 fair use 1000 checks per month). Prices in Stripe are created by `pnpm --filter @fliplens/api stripe:setup` using lookup_key. Checkout for a new subscription, Customer Portal for changes and cancellation. The local `subscriptions` table is written only by webhooks (signature verified, raw body). The limit is counted by scans per calendar month; when exceeded, the API responds with 402.
Safety: `STRIPE_SECRET_KEY_TEST` is used in development; a live key is rejected without `STRIPE_ALLOW_LIVE=1`.
This is correct for web (PWA); for App Store / Google Play apps, digital subscriptions must go through their billing (RevenueCat), which we will decide if native apps appear.

## ADR-013: Signed-in users only
Status: accepted 2026-09-28 (product owner decision).
Recognition (photo, barcode), valuation, history, Profile and billing require a Google account (otherwise 401 `sign_in_required`); without signing in, only the landing page, sign-in and legal pages are available. Every attempt is written to the database under the account: valuations (including "not enough data") and recognitions (including barcodes not found). Limits: valuations per plan, recognitions up to 3x the valuation limit per month (protection against OpenAI costs). Without DATABASE_URL (local development only) the check is disabled.

## ADR-014: Recognition cost control
Status: accepted 2026-09-28.
- Cascade: a photo is recognized first by `gpt-6-luna` (measured: $0.00024 for a clear label), and by `gpt-6-sol` only if luna's confidence is below 0.8 or nothing is found (`OPENAI_VISION_ESCALATE_BELOW`). The cost of both calls is summed in `usage_costs`; escalations are marked `(escalated)`.
- Recognition limit: 1.5x the plan's monthly check limit (was 3x).
- Plan limits are not reduced (Pro 100): after the cascade, the typical AI cost of Pro is about €0.25/month, the worst case about €1.8 against revenue of about €7.8 after VAT and Stripe.
- Risk: Reseller in the absolute worst case (all 1 500 recognitions escalated and with 3 photos) is about €17 of costs against €15.8 of revenue. Monitor on /admin; reduce fair use if necessary.
- /admin and statistics are available only to emails in `ADMIN_EMAILS`. `/api/me` no longer creates users for anonymous visits.
- eBay: default of about 5 000 calls/day per application (5 per check). Submit an Application Growth Check before launch.

## ADR-015: Monthly AI budget per user
Status: accepted 2026-09-28. Closes the Reseller risk from ADR-014.
- `aiBudgetMicroUsd` in `packages/core/src/plans.ts`: Free $0.30, Pro $3, Reseller $6. Counted from `usage_costs` per calendar month (UTC): recognition, barcode titles, listing generator.
- Below the budget the cascade works as usual. After the budget, recognition uses only `gpt-6-luna`, with no escalation to `gpt-6-sol` (event `ai_cheap_mode`).
- At 2x the budget, AI features stop until next month: 402 `ai_budget` (recognition) or `listing_limit` (listings). Price checks, manual entry and inventory keep working.
- Listing generator: no more listings per month than the plan's checks (Pro 100, Reseller 1 000).
- Result: the guaranteed AI cost ceiling for Reseller is about $12 (about €11) against revenue of about €15.8 after VAT and Stripe; a realistic maximum is about $8. Pro: ceiling $6 (about €5.6) against about €7.8.

## ADR-016: Search and AI discoverability
Status: accepted 2026-10-05.
- The app is a client-rendered SPA, so crawlers that do not run JavaScript (most AI crawlers) saw an empty page. `apps/web/scripts/site.ts` now generates, from one source (plans come from `@fliplens/core`): static content pages (`/how-it-works`, `/pricing`, `/faq`, `/guides`, 4 guides), `sitemap.xml`, `robots.txt` (AI crawlers explicitly allowed), `llms.txt` and `llms-full.txt`, plus the meta tags, Open Graph, JSON-LD and a prerendered text version of the start page inside `index.html`.
- The prerendered text is replaced by React on load and only becomes visible after 1.5 s if the app did not start, so app users see no flash.
- The server gives `/privacy` and `/terms` their own title and canonical, serves content pages without `.html`, redirects trailing slashes, and answers unknown paths with 404 plus `noindex` (they used to return 200).
- No ratings or reviews in structured data: we have none, and fabricated ones are against Google's rules.
- IndexNow (`pnpm --filter @fliplens/web indexnow`) notifies Bing, which ChatGPT search uses, after content changes.
