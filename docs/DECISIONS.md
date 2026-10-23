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

## ADR-017: English and German
Status: accepted 2026-10-12.
- The whole user-facing product is bilingual (English, German); the admin screen stays English.
- Language per page load: `/de` always German; otherwise the choice saved on the device (Profile, landing footer); otherwise the browser language (`de-*` gives German). Switching reloads the page, so modules read `LANG` as a constant (`apps/web/src/i18n.ts`).
- Strings live next to their code as `tr({ en, de })`; TypeScript enforces the same keys in both languages. Money and dates use the UI locale. Verdict reasons are built in English by `@fliplens/core` and translated on the client (`reason()`); fee preset texts via `presetText()`.
- Content pages exist under `/de/...` with hreflang pairs, a bilingual sitemap and German crawler text for `/de`. Privacy and Terms have a German translation; the English version prevails.
- Stripe Checkout, Customer Portal and receipts use the UI language. Photo listings return the "missing" hints in the UI language.
- German uses informal "du" in the app and on content pages, "Sie" in legal texts. Glossary: Check, Anzeige, Lager, Tarife, Wiederverkaufswert, Höchstpreis, Vergleichsangebote; verdicts Klarer Kauf, Kaufen, Grenzwertig, Finger weg.

## ADR-018: Referral programme
Status: accepted 2026-10-12 (product owner decision: 20%, 6 months, no promo codes).
- Every signed-in user has an invite link `fliplens.eu/?ref=CODE` (German: `/de?ref=CODE`); admins can set custom codes for creators. The code from a link is kept on the device for 30 days (first link wins) and applied only when a new Google account is created; never to oneself.
- Commission: `REFERRAL.sharePct` (20%) of each paid invoice of the invited user, without tax, for `REFERRAL.months` (6) after their first commissioned payment. Recorded from the Stripe `invoice.paid` webhook, once per invoice.
- Earnings are held `REFERRAL.holdDays` (14, the withdrawal period), then become available. Refunds: an admin reverses the commission in the admin screen (automatic matching of refunds to invoices is not reliable on the current Stripe API).
- Payouts: the user requests the whole available balance (minimum €20) by PayPal or IBAN; the admin pays by hand and marks it paid or rejected. Terms section 7 and the Privacy Policy describe the programme and the payout data.

## ADR-019: Ready for creator traffic
Status: accepted 2026-10-12.
- **In-app browsers.** Google blocks sign-in inside TikTok, Instagram, Facebook and similar WebViews. They are detected from the user agent (`apps/web/src/inapp.ts`); instead of the Google button the visitor sees how to open the page in a real browser, "Open in Chrome" (Android intent link) and "Copy link".
- **Try without signing in** (changes ADR-013). Guests get one check (up to 3 recognition attempts) and one photo listing per device, capped per IP per day (3 / 9 / 3) and per day overall (400 / 1200 / 400), so a viral video cannot run up the AI bill. Beyond that the API answers 401 `trial_used` and the app asks to sign in; guest data moves into the account on sign-in. The category hint while typing is free and does not count.
- **Invitee bonus.** People who sign up through an invite link get `REFERRAL.inviteeBonusChecks` (10) extra free checks for `inviteeBonusDays` (30). The landing page names the inviter by first name only (`GET /api/invite/:code`).
- **Share your find.** The result screen renders a 1080x1350 card in the browser (no upload) with the user's invite link, shared via the system share sheet or downloaded.
- **Partner page** `/partner` and `/de/partner` explain the programme for creators.

## ADR-020: Table scan
Status: accepted 2026-10-12.
- One photo of a stall, box or shelf (`POST /api/scan/shelf`, signed-in users only). One vision call (`OpenAIShelfScanner`, the strong model; the cheap one after the AI budget) lists the products with approximate bounding boxes; clutter and unbranded goods are skipped.
- Up to 6 recognised items (confidence at least 0.5) are valued like normal checks, from real eBay listings without a purchase price (answer: the most worth paying), three at a time, and saved to History. Each valued item counts as one check; with no checks left the request is refused before the vision call.
- Prices never come from the model. A live AR "radar" was considered and postponed: its on-the-fly prices would be model guesses.

## ADR-021: United Kingdom
Status: accepted 2026-10-12.
- Users whose country is the United Kingdom get market data from eBay.co.uk only (EBAY_GB) and all their amounts in pounds: estimates, profit, max price, stock, table scan, barcode lookups. Everyone else keeps the five EU eBay sites in euro. The country decides; `marketFor()` in core.
- New fee preset `ebay_uk_private` (no final value fee for UK private sellers, eBay UK help page, checked 2026-10-12). Profile shows the presets that fit the country and switches the preset when the country changes. Fixed fees of a preset in another currency are converted with the day's ECB rate (`feeProfileIn`).
- eBay category IDs used for search filtering are the same on EBAY_GB (verified on all mapped categories).
- FlipLens' own prices and referral earnings stay in euro.
- Update 2026-10-12: the selected eBay preset decides the market, not the country. eBay.co.uk = UK data in pounds, eBay.de (private or business) = EU sites in euro, from any country. Vinted and local pickup follow the country. The country only suggests the default preset (switching between the UK and the EU suggests that side's eBay) and decides marketplace links. All presets are offered everywhere.

## ADR-022: Live radar
Status: accepted 2026-10-12.
- Camera stays open; while the view changes, a 768 px frame goes to `POST /api/radar/frame` at most every 2.5 s (one at a time, not while the phone moves, not when the view is the same as the last frame). The answer is names and boxes only. Prices appear only after the user taps a box, which runs a normal check (`/api/valuation`, one check, real eBay listings). The radar never shows a guessed price.
- Recognition uses the cheap vision model with reasoning off (`reasoning.effort: none`): about 3.5 s and $0.0002 per frame in tests, against 10 to 14 s with default reasoning.
- Boxes follow the camera between frames with an on-device tracker: block matching on an 80 px grey thumbnail gives the global shift, boxes move by the shift since their frame was taken. No ML library is downloaded. MediaPipe/TensorFlow.js object detectors were considered: COCO classes miss most resale items (consoles, lenses, headphones), and the models add 5 to 15 MB.
- Signed-in (Google) users only. Frames do not use up checks or the recognition limit; they are recorded in usage_costs (`@radar-v1`), count towards the AI budget and the hard stop, and are capped per day: Free 120, Pro 600, Reseller 1500 (`RADAR_FRAMES_PER_DAY`). Server floor of 1.2 s between frames per device. The radar pauses after 75 s without a touch and when the page is hidden.

## ADR-023: Admin allowance
Status: accepted 2026-10-12.
- Accounts in ADMIN_EMAILS (signed in with Google) get at least 100 checks a month without a subscription (`ADMIN_MONTHLY_CHECKS`), and Pro limits for listings, AI budget and radar frames (`limitsPlan`). The plan itself stays Free: no Stripe subscription, nothing changes in billing. Paid plans keep their own, higher limits.

## ADR-024: Italian and French
Status: accepted 2026-10-12.
- Four UI languages: English, German, Italian, French. Same rules as ADR-017: /de, /it, /fr start pages force their language, otherwise the stored choice, otherwise the browser language; `tr()` requires all four, so TypeScript catches missing strings. Static pages under /it and /fr come from language packs (apps/web/scripts/site-it.ts, site-fr.ts, contract in site-common.ts); start-page meta and crawler text per language are generated (home-meta.json, prerender-<lang>.html) and served by the API. Legal texts in IT and FR are courtesy translations; the English version prevails. Stripe checkout and portal get the it/fr locale.
- New fee presets eBay.it and eBay.fr for private sellers: no selling fees for EEA private sellers since 2026-09-01 (official eBay pages, checked 2026-10-12); the buyer pays a protection fee. Market data stays the five EU eBay sites in euro. Italy defaults to eBay.it, France and Belgium to eBay.fr; every preset can be picked from any country.

## ADR-025: Publish on eBay
Status: accepted 2026-10-12.
- Sellers connect their eBay account once (OAuth authorization code grant, RuName EBAY_RUNAME, scopes sell.inventory, sell.account, commerce.identity.readonly), in a popup so the open listing and its photos stay in the app. We store only the eBay user id, username, the refresh token encrypted with AES-256-GCM (EBAY_TOKEN_KEY) and the ship-from postal code (table ebay_accounts). Access tokens live in memory.
- Publishing uses the Inventory API: photos go to eBay Picture Services (Media API), then inventory item, offer and publishOffer on eBay.de, .it, .fr or .co.uk (fixed price, quantity 1). Category from eBay's Taxonomy suggestions for the title; required item specifics from the Taxonomy API, pre-filled by the cheap text model from the listing text (only stated or certain facts); condition picked from what the category allows (Metadata API).
- Policies: the seller's own eBay shipping policy (we do not guess carriers or rates); payment and return policies are reused, or created with safe defaults when missing (private sellers: no returns; business sellers: 30 days, buyer pays return shipping). Sellers not yet in Business Policies are opted in.
- Marketplace Account Deletion: GET/POST /api/ebay/account-deletion answers eBay's challenge (EBAY_VERIFICATION_TOKEN) and deletes connections of closed eBay accounts. Signature verification of notifications is not implemented yet (a forged call can only disconnect an eBay account).
- Off unless EBAY_RUNAME and EBAY_TOKEN_KEY are set; the button is hidden then.

## ADR-026: UK vs EU comparison
Status: accepted 2026-10-16.
- On the result screen a checked item can be compared between eBay.co.uk (pounds) and the five EU eBay sites (euro), each with expected sale price, the most worth paying and the number of listings, amounts shown in both currencies, and which market sells for more (shown when the difference is at least 5%). For resellers who buy in one market and sell in the other (asked for by a UK retro games shop that sources in the EU twice a year).
- Only for the caller's own scan (POST /api/valuation/compare with scanId), so it cannot replace a check and costs none; the eBay searches are mostly served from the adapter cache. Private-seller fee profiles on both sides, the user's shipping converted at the ECB rate. Cross-border shipping, customs and VAT are not included and the card says so.

## ADR-027: Clothes, shoes and bags
Status: accepted 2026-10-19.
- Why: the first users who came from ChatGPT photographed clothes (Bershka shorts, Pull&Bear jeans, a hoodie). The strong vision model refused them (prompt said electronics only) and the matcher needed an exact model name, so every attempt ended in "not recognised" or "not enough data".
- New categories clothing, shoes, bags, accessories. A fashion product carries `fashion: { kind, gender, style? }` (core `FashionAttributes`): one of 26 types, women / men / unisex / kids, and a named line only when there is one ("Air Force 1", "501", "Nuptse").
- Search: brand plus style inside the eBay category for that type and department (e.g. women's shorts 11555, men's sneakers 15709); unisex searches the women's and the men's category, kids the girls' and boys' group. Category IDs are the same on DE, FR, IT, ES, NL and UK (Taxonomy API, checked 2026-10-19). The category does the type filtering, so listing titles in any language match. Matching (`matchFashionTitle`): the brand must be in the title (spelling variants such as "Pull & Bear", "Levi's"), the style too if given; bundles ("Konvolut", "10 Teile") and replicas are excluded. Without a style, comparables get similarity 0.8, which lowers confidence honestly.
- eBay's fashion conditions "Pre-owned Excellent" (2990) and "Fair" (3010) were filtered out before; now mapped to very good and fair.
- Asking-to-sold ratio 0.75 to 0.78 for fashion (asks sit further above real sale prices), pricing-0.1.7. Electronics unchanged.
- Unbranded items are not priced (422 brand_required): "blue hoodie" matches thousands of unrelated listings. Recognition returns an empty brand instead of "Unknown"; the confirm step then stays open and asks for the brand from the label. Manual entries get type and department from eBay's category suggestions.
- Result shows that clothes are priced by brand, type and condition and that Vinted often sells for less. Vinted has no public API, so its prices are not used.

## ADR-028: Clothes on Vinted, cheap items, fashion conditions
Status: accepted 2026-10-19.
- eBay comparables are total buyer prices (item plus shipping). For presets where the buyer pays shipping separately or there is none (Vinted, local pickup), the estimated sale prices are lowered by the typical shipping buyers pay (`typicalBuyerShipping`: median of paid shipping on domestic listings, else all listings, clamped 2 to 7; e.g. €4 in Germany, £3 in the UK). Before, Vinted and pickup valuations overstated the item price by the shipping. Applies to every category, also in table scan.
- Clothes, shoes and bags are valued for Vinted by default (most are sold there), with the user's eBay preset valued from the same listings and shown next to it ("On eBay.de instead"); one tap swaps the default (per device, `fliplens.clothesOnVinted.v1`). Only when both read the same market data. No extra eBay calls, no extra check.
- Cheap items: the fixed profit minimums (€20 strong buy, €10 buy, €5 borderline) are capped at 40%, 25% and 10% of the expected sale price, so a €2 buy that sells for €8 can be a buy. Low confidence still caps the verdict at borderline, except "buy" when even the quick-sale price clears the buy bar (downside covered); the verdict then says so. pricing-0.1.8. The benchmark dataset is empty (eval/dataset/items.jsonl missing), so this was checked on live examples: Switch OLED unchanged (buy), a €8 Mario Kart becomes strong buy (profit €18, ROI 225%).
- Fashion items use the clothing condition scale (new with tags, new without tags, very good, good, satisfactory, worn, damaged) with clothing hints; same seven internal conditions.
- After a fashion check the main action is "Write the Vinted listing", prefilled with brand, item, size (when read from the label), the suggested price and the condition.

## ADR-029: LEGO, books, vinyl, CDs, DVDs
Status: accepted 2026-10-19.
- New categories lego, books, vinyl, cds, movies, each searched in its eBay category (LEGO complete sets 19006, Books 267, Vinyl 176985, CDs 176984, DVDs & Blu-rays 617; same IDs on DE, FR, IT, ES, NL, UK, checked 2026-10-19).
- Product fields: LEGO brand "LEGO", model = set number; books brand = author, model = title; music brand = artist, model = album; films brand = format (DVD, Blu-ray, 4K), model = title. Recognition (photo and barcode titles, prompt-v3) fills them this way; the confirm step labels the fields accordingly (Set number, Author, Artist, Format, Title).
- Books, music and films found by barcode are searched by that EAN/ISBN (the exact edition). LEGO by set number: a listing must contain the number on its own (not inside a longer number; piece counts and years ignored); another set number of the same length means a bundle; instructions-only, incomplete, sticker and copy/"compatible" listings are excluded. Music needs the artist in the title, books only the title (authors are often missing). Films: a different format in the title (DVD vs Blu-ray vs 4K) is a different product. Media bundles ("Sammlung", "10 CDs", "lot of") are excluded.
- Asking-to-sold ratio: books, CDs, films 0.8, vinyl 0.85, LEGO 0.9 (pricing-0.1.9). Live checks: LEGO 75192 €766 (50 listings, high), 42115 €225, Pink Floyd Dark Side LP €74, Inception Blu-ray €8, a Harry Potter ISBN €10.

## ADR-030: Many items at once
Status: accepted 2026-10-19.
- One photo per item, up to 20. Each is recognised and valued like a normal check (one check and one recognition each, same limits), two at a time; clothes without a readable brand stop and ask for it instead of spending a check. Results list the expected and quick-sale price and the platform (Vinted for clothes by default), with a total. "Write all listings" writes one listing per item (same listing limits), prefilled with brand, item, size, condition and the suggested price.
- The queue is a module outside React (apps/web/src/batch.ts), so it keeps running while one item's details are open. Photos stay in memory only, like the single scan.

## ADR-031: Price alerts
Status: accepted 2026-10-19.
- After a check, signed-in users can ask to be told when the item is listed for at most a price (default: the max worth paying). Tables watches and push_subscriptions (migration 0011). Limits: Free 3, Pro 25, Reseller 100 alerts.
- A job in the API process runs every 10 minutes (ALERT_TICK_MIN) and claims up to 20 watches not checked for 3 hours (ALERT_CHECK_EVERY_MIN) with UPDATE ... FOR UPDATE SKIP LOCKED, so several instances never take the same watch. Each search uses the same market data as the check, newest listings first and at most 30 minutes old. A listing counts when it matches like a comparable (low outliers and better conditions included), its total price with shipping is at or below the alert price and at least half the median (cheaper is almost always a part or a scam), and it was not notified before (up to 300 ids remembered). Listings already there when the alert is created are shown at once and not notified later.
- Notifications are web push (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT; off without them) to every device of the user; gone subscriptions (404/410) are deleted. The service worker imports public/push-sw.js for the push and click handlers. On iPhone push works only in the app added to the Home Screen; the card says so.
- Local development shares the production database: ALERTS_WORKER=0 in the local .env keeps a laptop from running the job.

## ADR-032: Two guest checks; lens suggestions
Status: accepted 2026-10-22.
- Guests get two checks (up to 5 recognitions) and one listing per device before signing in; per IP and day 6 checks, 15 recognitions, 3 listings. The overall daily guest cap stays 400 checks (protects the eBay API quota). Why: a guest from Google search did one check, tried a second, hit the limit and left without signing in.
- Category auto-detect: eBay often suggests "Lenses" for a camera body name ("Olympus OM10": lenses made for it), which priced a camera from lens listings. A lens suggestion now counts only when the name reads like a lens (focal length, aperture, or a lens word or brand such as Zuiko, Sigma, Tamron); otherwise the next suggestion is used. Film cameras are still searched in the digital camera category (fewer listings); a film camera category is a possible next step.
## ADR-032: Browser extension for second-hand marketplaces
Status: accepted 2026-10-21.
- Resellers also source at the desk, scrolling listings. A Chrome extension (Manifest V3, apps/extension) shows a FlipLens panel on listing pages of Vinted (all 23 European sites), Kleinanzeigen, Subito, leboncoin, Wallapop (ES, IT, PT), Marktplaats with 2dehands/2ememain, willhaben and eBay (DE, AT, CH, FR, IT, ES, NL, BE, UK, IE, PL): the price the user would pay, a "Check resale profit" button, then the verdict, expected resale, profit with ROI, max buy price, the Vinted/eBay side by side for clothes, and "I bought it" (inventory with the listing URL in the notes).
- Nothing is sent before the click: each check uses one recognition and one check of the plan, like the app. Results are cached in the extension for 24 hours per listing, so revisiting a listing costs nothing.
- Identification from the listing text: POST /api/identify/listing takes title, description, page attributes (brand, size, condition, shipping, VB) and the first photo URL (low detail), and runs the cheap text model (OPENAI_TEXT_MODEL, about $0.0002 per listing). Stored as method `listing`; the valuation is recorded with input method `listing`.
- Price: Vinted adds buyer protection (EUR 0.70 + 5%) on top of the item price; the panel prefills that total, which matches the "incl. fee" price Vinted shows. Kleinanzeigen: the asking price. The user can edit it before checking.
- Account: the extension uses the web app's device key. A content script on the FlipLens origin copies the key and settings (platform, shipping, ROI target, clothes on Vinted) from the app's localStorage into extension storage; only that origin's script may set them, and the key is sent only to the FlipLens API (from the service worker, which has host permission, so no CORS). Signing out in the app resets the key and the extension follows on the next visit. A separate pairing flow with its own device can replace this later if extension sessions need revoking on their own.
- Reading pages (apps/extension/src/sites.ts, checked on live listings 2026-10-22): every site except Kleinanzeigen publishes schema.org Product data (title, price, currency, photo), used only when it names the current listing id, because single-page sites keep an earlier listing's data after navigating. Description and detail rows come from each site's markup; willhaben's structured description is an SEO sentence and eBay keeps the seller's text in an iframe, so those use the page and og:description. A price in another currency than the user's market (Vinted CZ, eBay.co.uk for a euro user) is not prefilled; the user types the total. Vinted from schema.org Product data matched to the item id (Vinted navigates without reloading, so older data may still be in the page), falling back to data-testid elements. Kleinanzeigen has two layouts live (A/B, October 2026); only the viewad-* ids are common to both, so the adapter reads those and tries both detail-row patterns. Only the page the user opened is read; the extension never crawls.
- Published on the Chrome Web Store (2026-10-23). The store listing names at most two marketplaces: the first version was rejected for keyword spam because the description listed them all; the full list lives in the FAQ. The web app offers "Add to Chrome" on the landing page and in Profile only in desktop Chromium browsers (apps/web/src/extension.ts), and hides it once the extension has marked the FlipLens page (data-fliplens-extension, set by app-session.ts from 0.1.2).
- Build: `pnpm --filter @fliplens/extension build` (production origin) or `dev` (Vite dev server at localhost:5173, rebuilt on change); load apps/extension/dist as an unpacked extension. `zip` makes the Chrome Web Store upload.

## ADR-033: Check from the start page; engagement events
Status: accepted 2026-10-22.
- Visitors from ChatGPT arrive with one item in mind, and the start page led with "Continue with Google". The hero now has "What do you want to check?" (a text field) and a photo button; either starts a check right away, as a guest when not signed in (ADR-032 limits). Google sign-in stays in the header. Typed text is split into brand and model (first word, or a known multi-word brand such as "The North Face"); one word goes to the model field. One-line subtitle, an example result under the field, categories in one sideways-scrolling row.
- Engagement: `landing_engaged` (scroll50 once half the page was scrolled, time15 after 15 s visible) and `landing_try` (text or photo), so "left at once" can be told apart from "read and left".
- Analytics fix: an event name missing from the server allowlist made the whole client batch fail validation (400), so events sent with it (visits too) were lost. Unknown names are now dropped one by one and logged (`unknown_events`); the missing names (batch mode, price alerts, app update, radar, eBay publish, UK vs EU) were added.

## ADR-034: Watches, branded jewellery, items we do not price; guest save card
Status: accepted 2026-10-23.
- Watches (category watches, eBay Wristwatches 31387, the same on all six sites): matched like devices by model or reference, without homages/replicas ("homage", "style", "replica") and loose parts (dial, bezel, movement, case, strap only). Live: Seiko SKX007 €349 (86 listings), G-Shock GA-2100 €105, Omega Seamaster Diver 300M €3383.
- Branded jewellery (category jewelry, priced like clothes by brand and type: necklace, bracelet, ring, earrings, charm). Leaf categories differ per site, so it is searched in Jewellery & Watches (281) and the type is checked by words in the title in six languages; watches are excluded. A type named in the typed text ("Thomas Sabo Charm") beats eBay's merged "bracelets & charms" category. Unbranded gold and silver is not priced (422 jewelry_unbranded): its value is weight and purity, which no photo or title gives.
- Items we do not price: when eBay's first category suggestion is under furniture/home, vehicles, real estate or tickets, the check stops with 422 unsupported_item and lists what works (no check used). Items in other unmapped categories (e.g. Dyson, Thermomix) are still priced as before.
- Recognition prompt-v4: watches and jewellery rules; a returned type decides the group (a necklace is jewellery even if filed under accessories). pricing-0.1.10 (asking-to-sold 0.85 watches, 0.75 jewellery).
- Guests: "Keep this result" (history, 10 free checks a month, price alerts, Google button) now sits right under the verdict instead of at the bottom of the result.
