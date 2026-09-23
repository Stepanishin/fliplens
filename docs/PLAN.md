# Technical Plan

Codename: **FlipLens** (рабочее название, не блокирует разработку).

Главный принцип: **Validate the data before building the product.**

Порядок разработки (не менять):

```text
DATA > VALUATION > RECOGNITION > PROFIT > MOBILE > BETA > PAYMENT > INVENTORY > LISTINGS
```

Фильтры для каждой фичи:
- Помогает ли это решить «buy or skip»? Если нет, не приоритет.
- Нужна ли эта сложность сейчас? Если нет, отложить.
- Есть ли право использовать эти данные? Если неизвестно, сначала исследовать.
- Можно ли решить дешевле: cache, deterministic код, без AI call?

---

## 1. Архитектура

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

Слои:
- `packages/core`: чистые функции. Вход: normalized product + normalized comparables + settings. Выход: valuation. Никакого marketplace-specific кода.
- `packages/sources`: адаптеры. Каждый возвращает `MarketplaceItem` в общем формате.
- `packages/recognition`: абстракция над vision/LLM provider и barcode lookup.
- `packages/db`: Drizzle schema, migrations, репозитории.
- `apps/api`: HTTP, auth, orchestration, кэш, cost tracking, логирование.
- `apps/cli`: `evaluate "Sony WH-1000XM4" --condition good --buy-price 55` (второй deliverable).
- `eval/`: benchmark dataset и regression scripts.

## 2. Стек

| Слой | Выбор | Почему (см. DECISIONS.md) |
|---|---|---|
| Язык | TypeScript strict, без `any` | typed, одна кодовая база |
| Monorepo | pnpm workspaces | ADR-001 |
| API | Fastify + Zod | ADR-002 |
| ORM | Drizzle | ADR-003 |
| DB | PostgreSQL | локально Homebrew 14, prod managed |
| Queue | нет; позже pg-boss; Redis/BullMQ только при нагрузке | ADR-005 |
| Images | Cloudflare R2 (S3 API, без egress fees) | retention policy |
| Vision | OpenAI Responses API (`gpt-6-sol`), strict structured output, за интерфейсом `VisionProvider` | ADR-006 |
| Mobile | Expo + React Native + TS, expo-camera | Phase 5 |
| Tests | Vitest | быстрый, TS native |
| Logging | pino (встроен в Fastify), JSON | structured |
| Errors | Sentry (API + mobile) | error tracking |
| Analytics | PostHog (EU cloud) | GDPR, self-host возможен |
| Billing | RevenueCat, Stripe для web позже | Phase 7 |

## 3. Ключевые интерфейсы

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

Pipeline (всё в `packages/core`, детерминировано):

```text
normalized product
  > fetch comparables (adapters, через кэш)
  > match & filter (similarity + exclusion_reason)
  > currency normalize (EUR, ECB rate на дату наблюдения)
  > condition normalize (к condition пользователя)
  > outlier removal (IQR / MAD)
  > distribution (count, min, p10, p25, median, p75, p90, max)
  > valuation (fast / expected / high)
  > confidence
```

### Matching и exclusion reasons

Каждый comparable получает `similarity_score` (0..1) и либо `included=true`, либо `exclusion_reason`:

```text
wrong_variant        (XM5 вместо XM4, Lite вместо OLED, 512GB вместо 128GB, EF вместо RF)
wrong_category       (case, чехол, амбушюры, кабель)
accessory_only
box_only / empty_packaging
for_parts / broken / defective
bundle               (консоль + 5 игр)
auction_unknown_final
duplicate            (тот же seller + title + price, cross-listing)
outlier_low / outlier_high
suspected_scam       (цена < 30% median, новый seller, и т.д.)
stale                (старше окна свежести)
currency_unknown
```

Реализация v1: rule-based (ключевые слова на EN/DE/FR/IT/ES/NL/PL + regex для model/capacity/mount + негативные токены вариантов). LLM-классификатор заголовков только если rules не справятся на benchmark, и с кэшированием по title hash.

### Цены

Если есть sold данные (приоритет):
- expected = median sold
- fast = p25 sold
- high = p75 sold

Если только asking:
- expected = median asking × `asking_to_sold_ratio` (по категории, калибруется на benchmark; стартовая гипотеза 0.85-0.90)
- fast = p25 asking × ratio
- high = p75 asking (как «high ask», явно помечено как asking)
- в UI явно: «Based on N active listings (asking prices), not sold prices»

Buy-back цены (если источник доступен) используются как нижняя граница: fast не ниже buy-back.

### Condition adjustment

1. Сначала сравнение с тем же condition bucket.
2. Если в bucket < 5 наблюдений, берём соседние buckets с множителями (стартовые значения, калибруются):

```text
new 1.00 | like_new 0.90 | very_good 0.82 | good 0.75 | fair 0.62 | poor 0.45 | for_parts 0.25
```

Множители хранятся как версионированная конфигурация по категории, не хардкодятся.

### Confidence

Числовой score 0..1, публично High (>=0.75) / Medium (>=0.5) / Low.

```text
confidence = identification_conf
           × f(count_included)          5 наблюдений: 0.6, 15: 0.85, 30+: 1.0
           × f(mean_similarity)
           × f(freshness)               median age наблюдений
           × data_kind_factor           sold 1.0, asking 0.8
           × f(spread)                  (p75 - p25) / median
```

Все факторы возвращаются вместе со score, чтобы UI мог показать «почему Medium».

Если count_included < 5 или identification_conf < 0.5: valuation не выдаётся, ответ `insufficient_data` с предложениями: другое фото, ввести модель, сканировать barcode.

## 5. Profit engine

```text
expected_sale_price
- marketplace_fee   (percentage × (price + shipping charged, если так считает marketplace) + fixed)
- payment_fee
- shipping_cost     (user default, позже по весу/стране)
- packaging_cost    (optional)
= expected_net
- purchase_price
= expected_profit

ROI = expected_profit / purchase_price × 100
```

Считается для трёх цен (fast/expected/high), чтобы показать диапазон прибыли.

Fee profiles: таблица `marketplace_fee_profiles`, версии по `effective_from/effective_until`, поле `source` (URL) и `last_verified_at`. Presets MVP: eBay (DE private seller), Vinted (buyer-pays модель, у продавца fee 0), Local pickup (fee 0, shipping 0).

Также считается **max buy price** для target ROI пользователя (дёшево, полезно сразу):

```text
max_buy = expected_net / (1 + target_roi)
```

## 6. Decision engine

Правила, не opaque score. Версионированная конфигурация:

```text
STRONG BUY : confidence >= medium AND ROI >= 60% AND profit >= €20 AND (liquidity unknown OR >= medium)
BUY        : confidence >= medium AND ROI >= 30% AND profit >= €10
BORDERLINE : ROI >= 10% OR profit >= €5, или confidence low при хороших цифрах
SKIP       : иначе
```

Low confidence никогда не даёт STRONG BUY. Ответ всегда содержит `factors[]` и `risks[]`.

## 7. Caching и market snapshots

- `market_snapshots`: (variant_id, region, condition_bucket, data_kind) > distribution, sample_size, captured_at, pricing_algorithm_version.
- TTL задаётся источником: eBay listings <= 6 часов, eBay-derived snapshots <= 24 часа (лицензия eBay, см. DATA_SOURCES.md).
- Scan, попавший в свежий snapshot, не вызывает marketplace API.
- UI: «Market data updated 3 hours ago».
- Raw listings хранятся с `first_seen_at/last_seen_at` и `price_snapshots` (цена не перезаписывается) только в пределах, разрешённых ToS источника. eBay listings удаляются после окончания.
- Comparables screen группирует comparables по источнику; eBay блок визуально отделён (no co-mingling).

## 8. Region

- MVP: `EU` (все EU сайты источника) и `country` пользователя.
- Позже: DE, FR, IT, ES, Benelux, Nordics, CEE.
- Cross-border optimization не в MVP.

## 9. Модель данных

Core таблицы (Phase 1-3). Деньги: integer minor units + currency (ADR-007).

```text
users, user_settings(country, currency, default_marketplace, shipping_default, packaging_default, target_roi, locale)
categories
products(id, category_id, brand, family, canonical_name)
product_variants(id, product_id, model, generation, sku, ean, upc, capacity, colour, size, release_year, attributes_json)
product_aliases(variant_id, alias, locale)          поисковые синонимы, в т.ч. из corrections
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

Каждая valuation хранит `pricing_algorithm_version` (semver, например `pricing-1.0.0`) и `recognition_model_version` (`openai:gpt-6-sol@prompt-v1`). История не пересчитывается задним числом. Любое изменение pricing проходит benchmark regression до merge.

## 11. Observability

- pino JSON logs, request id на каждый запрос, прокидывается в adapters и providers.
- Sentry для exceptions.
- Явные события ошибок: `source_fetch_failed{source,site,status}`, `recognition_failed{provider,reason}`, `valuation_insufficient_data`.
- Ни одного silent failure: если adapter упал, valuation помечает это в `warnings[]` и снижает confidence.

## 12. Cost tracking

На каждый scan пишем `usage_costs`: vision tokens × цена, marketplace calls, storage. Метрика: **cost per successful valuation**. Dashboard (SQL view) по пользователю и по месяцу. Лимит: variable cost пользователя должен быть заметно ниже цены тарифа.

Снижение стоимости:
- barcode сначала, vision только если barcode нет;
- market snapshot cache;
- уменьшение изображений до ~1MP перед vision;
- дешёвая модель по умолчанию, дорогая только при низком confidence.

## 13. Analytics

PostHog (EU), события из спецификации: scan_started, image_uploaded, barcode_scanned, product_detected, product_corrected, valuation_started, valuation_completed, valuation_failed, comparables_opened, item_marked_bought, subscription_viewed, subscription_started, inventory_added, item_sold. Без PII в properties. Opt-in согласно GDPR/ePrivacy.

## 14. Privacy / GDPR

- Data minimization: без location, без device fingerprint, без контактов.
- Endpoints: export data (JSON), delete account, delete scan, delete images.
- Image retention: фото без inventory удаляются через 7 дней после обработки (`scan_images.delete_after`), job ежедневно. Фото inventory item хранятся, пока item существует. Политика описана в приложении.
- Фото отправляются vision provider только для идентификации; провайдер с zero data retention / без обучения на данных.
- EU hosting для DB и storage.

## 15. Error UX

Никогда не выдавать fake valuation. Ответ `insufficient_data` содержит причину и действия: `retake_photo`, `enter_model`, `scan_barcode`. Всегда показывать source count, data age, confidence, comparables.

## 16. i18n

UI на английском, строки через i18n ключи с первого дня (expo-localization + i18next). Normalization словари по языкам (condition термины, «defekt», «pour pièces», «per ricambi»...).

## 17. Не делать до product-market validation

Social feed, marketplace, chat, shipping, payments for goods, logistics, AI-generated фото, accounting, tax filing, desktop client, web3, gamification, forum, сложные referral программы, автопостинг через неофициальные endpoints, SEO price pages, opportunity discovery.

AI не позиционируется как продукт. Пользователь покупает лучшие sourcing decisions.
