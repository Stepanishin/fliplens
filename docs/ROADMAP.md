# Roadmap

Каждая фаза заканчивается gate. Следующая фаза стартует только если gate пройден. Сроки ориентировочные, для одного разработчика с AI-агентом.

```text
Phase 0  Feasibility research        2-3 недели   GATE: данные пригодны?
Phase 1  Data prototype (backend)    2 недели     GATE: POST /valuation полезен?
Phase 2  Recognition prototype       2 недели     GATE: >80% identification?
Phase 3  Profit engine + presets     1 неделя     GATE: end-to-end API готов
Phase 4  Liquidity                   только если данные позволяют (не блокирует)
Phase 5  Mobile MVP (Expo)           3-4 недели
Phase 6  Private beta (20-30)        4-6 недель   GATE: scans/active user/week
Phase 7  Monetization                после beta сигнала
Phase 8  Inventory                   после beta (может быть feature flag раньше)
Phase 9  Listing generator           после inventory
```

---

## Phase 0: Feasibility research

Цель: доказать или опровергнуть, что мы можем получать качественные comparables и определять товар.

### 0.1 Исследование источников данных
- Для каждого источника из [DATA_SOURCES.md](DATA_SOURCES.md) заполнить матрицу: API, sold data, ToS, rate limits, commercial usage, redistribution.
- Зарегистрировать eBay developer account, получить keys (sandbox + production).
- Подать заявку на eBay Marketplace Insights API (sold data, доступ ограничен).
- Результат: ранжированный список источников, 1-2 выбраны для MVP.

### 0.2 Тестовый dataset
- 100 реальных товаров: 30 electronics, 25 gaming, 25 cameras/lenses, 20 tools.
- Для каждого: 1-3 фото, exact identity, EAN если есть, condition, hypothetical purchase price, known market range (ручной), source URLs.
- Формат: `eval/dataset/items.jsonl` + `eval/dataset/images/`.
- Фото: свои вещи, вещи друзей, реальные фото из charity shops (с разрешением). Не брать стоковые фото производителя, они завышают accuracy.

### 0.3 Spike: comparable retrieval
- Скрипт: для каждого товара из dataset запросить eBay Browse API (EBAY_DE, EBAY_FR, EBAY_IT, EBAY_ES, EBAY_GB, EBAY_NL...).
- Применить черновой фильтр bad comparables.
- Измерить: сколько relevant comparables на товар, precision фильтра (ручная разметка выборки).

### 0.4 Spike: identification
- Прогнать фото через vision model (OpenAI) со structured output.
- Прогнать EAN через eBay Browse `gtin` + 1-2 barcode DB.
- Измерить exact / near-exact / wrong по категориям.

### 0.5 Spike: pricing usefulness
- Черновой pricing (median/p25/p75 после фильтров) против known market range.
- Измерить долю оценок с ошибкой > ±50%.

### Gate Phase 0

| Метрика | Порог |
|---|---|
| Identification accuracy Tier 1 (exact или near-exact) | > 80% |
| Товаров с >= 5 relevant comparables | > 70% |
| Оценок с ошибкой > ±50% | < 10% |
| Хотя бы 1 источник юридически пригоден для commercial use | да |

Если gate не пройден: не идти в mobile. Решать data layer (другие источники, лицензированные feeds, сужение категорий).

Deliverable: `docs/PHASE0_REPORT.md` с цифрами и решением go/no-go.

---

## Phase 1: Data prototype

Backend-only. Без UI.

- Monorepo (pnpm workspaces), `packages/core`, `packages/db`, `packages/sources`, `apps/api`.
- PostgreSQL schema (Drizzle) для core сущностей: products, product_variants, marketplaces, marketplace_listings, price_snapshots, valuations, valuation_comparables, fx_rates.
- eBay source adapter + кэш результатов (не дёргать API на каждый запрос).
- Normalization: title parsing, variant matching, bad comparable filter с exclusion_reason.
- FX: ECB daily reference rates, хранение original + EUR + fx timestamp.
- Pricing engine v1 (статистика, см. PLAN.md), confidence, algorithm_version.
- `POST /valuation` по контракту из PLAN.md.
- Unit tests на core (pricing, filter, profit) с fixtures.
- Eval script: прогон 100 товаров через `/valuation`, отчёт.

Gate: eval показывает те же или лучшие цифры, чем Phase 0 spike, при стабильном API.

---

## Phase 2: Recognition prototype

- `POST /identify` (photo): vision model, structured output, top-N кандидатов с confidence.
- `POST /identify` (barcode): GTIN lookup, fallback chain.
- Canonical product matching: результат vision маппится на `product_variants`, а не остаётся свободным текстом.
- Логирование corrections (`product_identifications`).
- `eval/scripts/identify.ts`: repeatable прогон, confusion по категориям, calibration confidence.

Gate: > 80% exact/near-exact для Tier 1. Confidence откалиброван (при confidence >= 0.85 accuracy >= 90%).

---

## Phase 3: Profit engine

- `marketplace_fee_profiles` (versioned, с source и last_verified_at).
- Scenario presets: eBay, Vinted, Local pickup.
- User settings: country, currency, default marketplace, shipping default, packaging cost.
- Decision engine (правила, прозрачные факторы).
- API: `POST /scans`, `POST /scans/:id/valuation`, `GET /scans` (history).

Gate: полный flow через API: identify, confirm, price, valuation, decision. Всё покрыто тестами.

---

## Phase 4: Liquidity

Только если есть реальные данные (sold count, days on market).

- Периодический re-fetch отслеживаемых listings, фиксация `last_seen_at`, исчезновение как proxy продажи (с оговорками).
- Метрики: comparable_count, new_listings_30d, sold_count_30d, median_days_on_market, sell_through_rate.
- Если данных нет: UI показывает «Liquidity data unavailable». Никаких выдуманных цифр.

Не блокирует Phase 5.

---

## Phase 5: Mobile MVP

- Expo + TypeScript, expo-camera (фото + barcode scanning).
- Экраны: Scan, Recognition (Correct / Edit), Purchase Price, Result, Comparables, History, Profile.
- Auth (email magic link или Apple/Google sign-in).
- Image upload в S3-compatible (Cloudflare R2), retention policy (например, 30 дней).
- Performance target: camera open до result <= 4 тапа, <= 8 секунд при хорошей сети.
- Analytics events для beta метрик.

---

## Phase 6: Private beta

- 20-30 реальных European resellers (Reddit, Discord, eBay/Vinted сообщества, flea market группы). Не только друзья.
- Метрики: scans per active user per week (главная), scan completion rate, correction rate, comparables opened, items marked bought, D7/D30 retention.
- Сильный сигнал: 30-100 scans/week у пользователя, использование во время sourcing trip.

Gate: >= 30% beta users делают >= 20 scans/week через 4 недели.

---

## Phase 7: Monetization

- Free: 5-10 scans/month. Pro ~€9.99. Reseller ~€19.99. Цены гипотеза.
- RevenueCat поверх App Store / Play subscriptions. Stripe для web позже.

## Phase 8: Inventory

- «I BOUGHT IT» создаёт inventory item. Statuses: bought, ready_to_list, listed, sold, returned, discarded.
- Dashboard: items, invested, expected revenue, expected profit. Позже realized profit, turnover.

## Phase 9: Listing generator

- Title, description, specs, condition text, suggested price, keywords под стиль marketplace.
- Только copy title, copy description, share images, open marketplace. Никакого автопостинга через неофициальные endpoints.

## Phase 10: Actual sales

- Пользователь вводит sold_price, marketplace, fees, shipping, sale_date.
- Считаем actual_profit, actual_roi, days_to_sell.
- Каждая продажа пополняет собственный dataset (predicted vs actual). Это главный долгосрочный moat.
- Predicted vs actual используется для калибровки pricing (asking_to_sold_ratio, condition multipliers).

## Phase 11: Personal sourcing intelligence

- ROI и selling time по категориям пользователя.
- «You perform better with gaming products than cameras.»
- Personal max buy price: market resale, your typical fees, your target ROI.

## Позже (только после валидации)

- Opportunity discovery (listing на 35% ниже оценки).
- Публичные SEO price pages.
- Cross-border sale suggestions.
- Tier 2 категории: power tools, LEGO, watches, PC components, audio, networking, drones. Fashion последним.

---

## Deliverables

1. **Feasibility Report** (`docs/FEASIBILITY_REPORT.md`): источники, API, ограничения, sold vs active, стоимость, категории, benchmark, риски, рекомендованный data stack, GO/NO-GO.
2. **CLI/backend prototype**: `evaluate "Sony WH-1000XM4" --condition good --buy-price 55`.
3. **Photo recognition prototype**: `photo.jpg` в JSON identity с confidence.
4. **Mobile alpha**: Scan, confirm, price, valuation. Не больше.
5. **Private beta**: 20-30 users.

## Отчёт после каждой фазы

1. Что сделано. 2. Найденные проблемы. 3. Объективные результаты (цифры). 4. Обновлённые риски. 5. Следующий шаг.
