# FlipLens

A Europe-first sourcing copilot for resellers. It answers one question:

> "I can buy this item for €X. Is it worth buying to resell?"

Take a photo or scan a barcode. FlipLens identifies the product, finds comparable listings on European eBay sites, estimates the resale value, subtracts fees and shipping, and gives a clear verdict: **STRONG BUY / BUY / BORDERLINE / SKIP**, with profit, ROI and the maximum price worth paying.

FlipLens is not a marketplace. It does not sell, take payments for items or ship anything.

## Features

- **Recognition:** photo (up to 3 per item, resized on the device, never stored) or barcode (native `BarcodeDetector`, ZXing fallback, or typed EAN/UPC).
- **Valuation:** eBay Browse API across DE, FR, IT, ES and NL, with category auto-detection, outlier filtering, condition matching and fee presets per marketplace.
- **Result:** resale range, expected profit, ROI, max buy price, a what-if price slider and comparable listings with thumbnails.
- **Marketplace links:** deep links to Vinted, Kleinanzeigen and other European marketplaces for a manual check.
- **Stock:** "I bought it" moves an item into inventory; track statuses, record the sale, see real profit and how accurate the estimate was.
- **Listing generator** (paid plans): title, description and condition text in the style of eBay, Vinted or Kleinanzeigen, in the seller's language.
- **Accounts and billing:** Google sign-in, Stripe Checkout and Customer Portal. Plans: Free (10 checks/month), Pro €9.99 (100), Reseller €19.99 (1,000 fair use).
- **Cost control:** a cheap vision model first with escalation only when unsure, plus a monthly AI budget per user (see [ADR-015](docs/DECISIONS.md)).
- **PWA:** installable on phones, with an install prompt.

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict), pnpm workspaces |
| API | Fastify 5, zod, helmet (CSP), rate limiting |
| Web | React 19, Vite 7, vite-plugin-pwa |
| Database | Neon Postgres, Drizzle ORM (migrations run at API startup) |
| Recognition | OpenAI Responses API (`gpt-6-luna`, escalating to `gpt-6-sol`) |
| Market data | eBay Browse and Taxonomy APIs |
| Auth / payments | Google Identity Services, Stripe |

## Repository layout

```text
apps/
  api/          Fastify backend; also serves the built web app in production
  web/          React PWA
packages/
  core/         pure logic: normalization, pricing, profit, decision, plans (no I/O)
  db/           Drizzle schema, migrations, repository functions
  sources/      market data adapters (eBay)
  recognition/  vision providers, cascade, barcode helpers, listing writer
eval/           benchmark dataset and evaluation scripts
docs/           plan, roadmap, research, architecture decisions
```

## Getting started

Requirements: Node.js 20+, pnpm 9.

```bash
pnpm install
cp .env.example .env    # then fill in the keys (see below)
pnpm dev                # API on :8787, web on http://localhost:5173
```

### Environment

All variables are documented in [`.env.example`](.env.example). The minimum for local development:

| Variable | Purpose |
|---|---|
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | eBay Browse API (market prices) |
| `OPENAI_API_KEY` | photo recognition, barcode titles, listings |
| `DATABASE_URL` | Neon Postgres connection string |
| `GOOGLE_CLIENT_ID` | Google sign-in (OAuth client of type Web, origin `http://localhost:5173`) |
| `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST` | Stripe in test mode |

Check the eBay keys with `scripts/ebay-smoke.sh "Sony WH-1000XM4"`.

### Stripe (test mode)

```bash
pnpm --filter @fliplens/api stripe:setup    # creates products and prices by lookup key
pnpm --filter @fliplens/api stripe:listen   # forwards webhooks to the local API
```

Test card: `4242 4242 4242 4242`, any future date and any CVC. A live key is refused unless `STRIPE_ALLOW_LIVE=1` is set.

### Testing the PWA on a phone

Service workers and installation require HTTPS (or localhost).

```bash
pnpm --filter @fliplens/api dev          # terminal 1
pnpm --filter @fliplens/web dev:https    # terminal 2: self-signed HTTPS on the local network
```

Open `https://<laptop IP>:5173` on a phone in the same Wi-Fi, accept the certificate, then use "Add to Home Screen".

## Production

The app runs as a single Node.js service: the API serves the built PWA from `apps/web/dist` (SPA fallback, cached assets), so the app and `/api` share one domain.

```bash
pnpm --filter @fliplens/web build
cd apps/api && HOST=0.0.0.0 PORT=8080 TRUST_PROXY=1 npx tsx src/server.ts
```

- Security headers (CSP, HSTS, COOP for Google sign-in) and per-route rate limits are always on.
- The benchmark endpoint is disabled unless `ENABLE_BENCHMARK=1`.
- Stripe webhook endpoint: `POST /api/stripe/webhook`.
- Admin overview at `/admin` for emails listed in `ADMIN_EMAILS`.

## Data and privacy

- Photos are sent to the recognition provider and never stored.
- eBay listing content is cached in memory for up to 6 hours and never written to the database, as the eBay API license requires ([ADR-009](docs/DECISIONS.md)).
- Users can export or delete all their data from Profile; deleting an account also cancels the Stripe subscription.

## Documentation

| File | Contents |
|---|---|
| [docs/FEASIBILITY_REPORT.md](docs/FEASIBILITY_REPORT.md) | Phase 0: data sources, licensing, costs, risks, go/no-go |
| [docs/PLAN.md](docs/PLAN.md) | Architecture, stack, data model, pricing and decision engine |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases, deliverables and gate criteria |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Data source matrix and legal checklist |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records (ADR) |
| [eval/README.md](eval/README.md) | Benchmark dataset and metrics |

## License

Proprietary. All rights reserved.
