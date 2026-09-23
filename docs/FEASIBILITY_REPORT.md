# Feasibility Report (Phase 0, desk research)

Дата: 2026-09-23. Статус: desk research завершён, эмпирический benchmark ещё не проведён.

Метки достоверности: **V** проверено на официальной странице, **S** вторичный источник, **U** не проверено. Ссылки в разделе «Источники».

---

## TL;DR

1. **Легального, открытого источника EU sold prices сейчас нет.** eBay Marketplace Insights закрыт для новых пользователей (V), Finding API выключен 2025-02-04 (V). C2C classifieds (Vinted, Kleinanzeigen, Leboncoin, Wallapop, Subito, Willhaben, OLX, Marktplaats, Facebook) не дают доступ к чужим объявлениям и запрещают scraping (V/V~).
2. **eBay Browse API технически идеален** (все 11 EU сайтов, поиск по GTIN, condition, страна, бесплатно), **но лицензия eBay ограничивает наш use case**: данные не старше 6 часов, удаление после окончания listing, запрет смешивать с non-eBay данными в public display, и нужно письменное разрешение на отображение данных, позволяющих вывести average selling price (V).
3. **Технически всё остальное дёшево и решаемо**: vision ~$0.005-0.011 за scan, barcode lookup от €19/мес, FX бесплатно (ECB). Unit economics при €9.99/мес не проблема.
4. **Рекомендация: CONDITIONAL GO на Phase 1 (Data Prototype) как internal research tool**, параллельно с legal/BD треком. **NO-GO на public beta**, пока нет письменного разрешения eBay или другого лицензированного источника цен.

---

## 1. Candidate data sources

| Источник | Тип доступа | Данные | Sold | Вердикт |
|---|---|---|---|---|
| eBay Browse API | Official API | Active listings, 11 EU сайтов, GTIN/ePID | Нет | Технически лучший. Лицензия требует согласования для pricing tool |
| eBay Marketplace Insights | Restricted API | Sold за 90 дней (DE, ES, FR, GB, IT) | Да | Закрыт для новых (V). Только через BD |
| eBay Catalog API | Official API | Product identity по GTIN, ePID | n/a | Полезен для identification (AU, CA, DE, ES, FR, GB, IT, US) |
| Tradera (SE) | Official SOAP API | Active listings, bids | Возможно (U) | Кандидат после legal review API Terms |
| Back Market | Affiliate (Awin) | Refurbished retail цены | Нет | Верхняя граница (ceiling) |
| Rebuy | Affiliate (Awin), product feeds (V~) | Цены продажи refurbished/used | Нет | Anchor для electronics/gaming/cameras |
| Rakuten FR | Affiliate (Awin) | New + used offers | Нет | Кандидат |
| MPB | Affiliate (Awin/Skimlinks), feed не подтверждён | Used cameras | Нет | Кандидат, если есть feed |
| idealo | Affiliate | New prices | Нет | New-price anchor |
| PriceCharting | Paid API | Games/consoles loose/CIB/new, есть PAL | Не ясно | Для public display нужна commercial license (V) |
| Keepa | Paid API (€49+/мес) | Amazon .de/.fr/.it/.es/.co.uk, used price history | Нет | Research. Проверить права на display |
| RecommerceIQ | Free index + paid platform | Buyback цены смартфонов FR/DE/IT | Buyback | Research/partner |
| Allegro (PL) | Official API, search закрыт для новых apps | Offers, popularity buckets | Нет | Не использовать: ToS 2025-09-23 запрещает price comparison (V~) |
| Marktplaats, OLX, Finn | Official API | Только свои объявления | Нет | Не подходят |
| Vinted, Kleinanzeigen, Wallapop, Leboncoin, Subito, Willhaben, FB Marketplace | Нет API | n/a | Нет | Не использовать. Leboncoin выигрывал суды против scrapers |
| CEX / webuy | Только internal JSON endpoints | Buy/sell цены | n/a | Не использовать (undocumented) |
| **Собственные данные пользователей** | Наш продукт + eBay Sell APIs (OAuth пользователя) | Реальные purchase и sale цены | Да | Главный долгосрочный источник и moat |

## 2. Official API availability

- eBay: Browse (open, но Buy APIs формально Limited Release с production через eBay Partner Network, V), Catalog (open), Marketplace Insights (closed), Finding/Shopping (decommissioned 2025-02-04), Product API (decommissioned 2026-08-15).
- Tradera: SOAP API с AppId/AppKey.
- Остальные EU marketplaces: API только для управления собственными объявлениями.

## 3. Commercial usage constraints

eBay API License Agreement (V, ключевые пункты):
- listing данные не старше 6 часов, прочий контент не старше 24 часов, иначе раскрывать возраст;
- удалять eBay content, когда он больше не публично доступен (нельзя копить базу ended listings);
- в public display нельзя смешивать eBay content с non-eBay content, нужно визуально разделять;
- нужно express prior written permission на использование, позволяющее вывести average selling price по eBay категории;
- Restricted APIs (pricing, market trends) для pricing tools только с письменного согласия, eBay получает лицензию на ваш tool;
- запрет обучения ML/AI на eBay content;
- eBay считает своим «content created or derived therefrom».

Интерпретация (требует юриста): per-item оценка на основе active listings, показанная пользователю вместе с этими listings и ссылками на eBay, ближе к разрешённому «enable users to search and browse listings», чем price guide. Но «Expected resale €105» как агрегат находится в серой зоне. **Считать eBay source НЕ production-ready до письменного подтверждения от eBay.**

Прочее:
- PriceCharting: API на подписке только для «Internal Business Purposes» (V).
- Open Icecat: open content license, возможные ограничения на AI use (U), проверить до использования.
- EU право: CV-Online v Melons (C-762/19) и Ryanair v PR Aviation (C-30/14) делают scraping classifieds рискованным и через database right, и через ToS.

## 4. Sold vs active data availability

| Тип | Доступно легально сейчас |
|---|---|
| Active asking prices | Да: eBay Browse (с ограничениями лицензии), Tradera |
| Sold prices (C2C) | Нет. Только eBay Marketplace Insights через BD, partner deals (Adevinta, Vend), или собственные данные |
| Refurbished retail (ceiling) | Да: affiliate feeds Back Market, Rebuy, Rakuten |
| Buy-back (floor) | Частично: RecommerceIQ index (смартфоны), остальное через partner |
| New price | Да: idealo affiliate |

Следствие для pricing engine: v1 работает на **asking prices + anchors** (refurb ceiling, new price, buyback floor). asking-to-sold ratio калибруется на ручном ground truth из benchmark, а затем на реальных продажах пользователей. В UI всегда явно: «based on N active listings, asking prices».

## 5. Expected API costs

| Статья | Стоимость | На scan |
|---|---|---|
| Vision, Claude Haiku 4.5 (2 фото ~1MP) | $1 / $5 за 1M tokens | ~$0.0055 |
| Vision, Claude Sonnet 5 | $2 / $10 | ~$0.011 |
| Vision, Claude Opus 5.5 (fallback) | $4 / $20 | ~$0.022+ |
| Full-res фото без resize | ~3x tokens | ~$0.025 на Sonnet |
| eBay Browse, Catalog | бесплатно, ~5k calls/day default (U), расширение через Growth Check | ~0 |
| Barcode: EAN-Search.org | €19/мес за 5k, €39 за 50k | < €0.004 |
| Barcode: opengtindb (DE) | бесплатно, GNU FDL | 0 |
| FX: ECB | бесплатно | 0 |
| Affiliate feeds | бесплатно | 0 |
| PriceCharting | ~$49/мес + commercial license (цена неизвестна) | n/a |
| Keepa | €49-459/мес | n/a |

Оценка variable cost на успешную valuation: **€0.01-0.03** (vision + cached market snapshot). Pro пользователь со 100 scans/мес: ~€1-3 variable cost при €9.99. Heavy reseller с 1000 scans: €10-30, поэтому unlimited на €19.99 требует fair use лимита или barcode-first + cache hit rate > 50%.

Обязательно: resize до ~1MP на устройстве, barcode перед vision, Haiku/Sonnet по умолчанию, Opus только при низком confidence.

## 6. Categories easiest to support

| Категория | Identification | Data | Оценка |
|---|---|---|---|
| Gaming (консоли, boxed games) | Лёгкая: EAN на коробке, чёткие модели | eBay много listings, Rebuy, PriceCharting PAL | **Лучшая для старта** |
| Smartphones / tablets | Средняя: модель видна, capacity нет на фото | eBay, Back Market, Rebuy, RecommerceIQ | **Хорошая**, но capacity нужно спрашивать |
| Headphones, smartwatches | Средняя: похожие поколения (XM3/XM4/XM5) | eBay, Rebuy, Back Market | Хорошая |
| Cameras bodies | Средняя: модель напечатана на корпусе | eBay, MPB (feed?), Rebuy | Средняя |
| Lenses | Трудная: mount, версии (II, III), OSS/IS | eBay; MPB без API | Трудная, отложить в Tier 1b |
| Power tools | Трудная: body-only vs kit, батареи | eBay, мало refurb anchors | Tier 2, как в спецификации |

Предложение: Phase 1 фокус **gaming + smartphones + headphones**, cameras bodies вторыми, lenses и tools после.

## 7. Benchmark approach

Детально: [eval/README.md](../eval/README.md). Кратко:
- 100 товаров (30/25/25/20), включая трудные пары вариантов.
- Ground truth market range собирается вручную из sold данных (eBay sold search под своим аккаунтом, Rebuy/CEX цены, MPB), с датой.
- Метрики: identification exact/near-exact/top-3 и calibration; retrieval (доля товаров с >= 5 comps, precision фильтра на ручной разметке); pricing (median APE, in-range, доля ошибок > 50%); доля ложных STRONG BUY; cost и latency.
- Отдельно метрики asking-based vs anchor-based оценок.

## 8. Main risks

| # | Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|---|
| R1 | eBay не даёт разрешение на pricing use | Средняя-высокая | Критическое | Запросить письменно сейчас; параллельно affiliate anchors и собственные данные; дизайн UI в рамках «search and browse listings» |
| R2 | Asking prices плохо предсказывают sold | Средняя | Высокое | Калибровка ratio по категории, anchors, честная маркировка, снижение confidence |
| R3 | Нет sold data, liquidity не посчитать | Высокая | Среднее | «Liquidity data unavailable», позже собственные данные и active listing count как proxy |
| R4 | Buy API production access требует ePN approval | Средняя | Высокое | Подать заявку в ePN и Growth Check в первую неделю |
| R5 | Лицензия eBay запрещает хранение ended listings и ML | Высокая (факт) | Среднее | Не строить исторический eBay архив; moat строить на собственных данных пользователей |
| R6 | Variant confusion (XM4/XM5, RF/EF, capacity) | Высокая | Высокое | Rule-based variant matcher, barcode-first, уточняющий вопрос capacity |
| R7 | Heavy users дорогие | Низкая-средняя | Среднее | Cache, barcode-first, fair use |
| R8 | Affiliate feeds не содержат нужных полей или запрещают такой use | Средняя | Среднее | Проверить условия Awin программ до интеграции |

## 9. Recommended MVP data stack

**Strategy A (рекомендуется для Phase 1): eBay asking + anchors + own data**
- Identity: barcode (EAN-Search / opengtindb) + eBay Catalog по GTIN, vision (Claude Haiku/Sonnet) для фото.
- Price: eBay Browse (все EU сайты), в UI отдельный eBay блок, live fetch с TTL <= 6 часов.
- Anchors: Rebuy / Back Market affiliate feeds (refurb ceiling), idealo (new price).
- Own data: purchase и actual sale в приложении, импорт собственных продаж пользователя через eBay Sell APIs (OAuth пользователя).
- Статус: internal/prototype; для public launch требует eBay written consent.

**Strategy B (параллельно, BD трек): licensed sold data**
- eBay BD: Marketplace Insights + consent на pricing tool.
- Partner запросы: Adevinta (Leboncoin, Subito, Marktplaats, Willhaben), Vend (Blocket, DBA, Finn), Tradera, MPB, RecommerceIQ.
- PriceCharting commercial license для gaming.

**Strategy C (fallback, если A и B не удались): assisted lookup + own data**
- Приложение идентифицирует товар и строит deep links на sold/active поиск в eBay, Vinted, Kleinanzeigen, которые пользователь открывает сам.
- Profit calculator на цене, которую пользователь подтвердил.
- Оценка из собственного dataset по мере роста.
- Слабее по UX, но юридически чистая. Identification + profit engine полезны и так.

## 10. GO / NO-GO

| Критерий Phase 0 | Статус |
|---|---|
| Identification > 80% Tier 1 | Не измерено. Требует benchmark с фото |
| >= 5 relevant comps для большинства | Вероятно да для eBay (объём EU listings), не измерено |
| Pricing без систематических ±50% | Не измерено; риск R2 |
| Хотя бы 1 источник юридически пригоден для commercial use | **Условно.** eBay Browse пригоден для browse-подобного use; pricing aggregation требует согласия |

**Решение: CONDITIONAL GO на Phase 1 Data Prototype** в режиме internal research tool (CLI, без публичного отображения данных), чтобы эмпирически закрыть три незакрытых критерия.

**NO-GO на mobile / public beta**, пока не выполнено одно из:
1. письменное разрешение eBay на pricing use (или доступ к Marketplace Insights);
2. другой лицензированный источник цен с покрытием >= 70% benchmark;
3. осознанный выбор Strategy C.

---

## Blockers и немедленные действия

| # | Действие | Кто | Блокирует |
|---|---|---|---|
| B1 | Зарегистрировать eBay developer account, получить production keyset | пользователь | Phase 1 fetch |
| B2 | Подать заявку в eBay Partner Network и Application Growth Check | пользователь | Production Buy API |
| B3 | Письмо в eBay developer relations/BD: описание продукта, запрос consent на pricing display и Marketplace Insights | пользователь (черновик готовит агент) | Public launch |
| B4 | Anthropic API key | пользователь | Recognition spike |
| B5 | Собрать 100 товаров с фото (реальные условия) и ручными sold ranges | пользователь + агент (шаблон готов) | Все gate метрики |
| B6 | Юридическая проверка: eBay License, Awin программы, Tradera API Terms, Icecat license | юрист | Production |
| B7 | Регистрация в Awin, запрос feeds Rebuy, Back Market, MPB | пользователь | Anchors |

## Assumptions

- Internal research use eBay Browse данных для проверки feasibility (без публичного отображения) совместим с лицензией. Подтвердить у юриста.
- asking-to-sold ratio 0.85-0.90 как стартовая гипотеза, калибруется.
- Default rate limit Browse ~5k/day достаточен для benchmark (100 товаров × 11 сайтов = 1100 calls на прогон).

## Источники

eBay:
- Browse OpenAPI: https://edp.ebay.com/api-docs/master/buy/browse/openapi/3/buy_browse_v1_oas3.json
- Supported marketplaces: https://edp.ebay.com/api-docs/buy/static/ref-marketplace-supported.html
- Browse filters: https://edp.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html
- Buy API requirements: https://edp.ebay.com/api-docs/buy/static/buy-requirements.html
- Deprecation status: https://edp.ebay.com/develop/get-started/api-deprecation-status
- Catalog API: https://edp.ebay.com/api-docs/commerce/catalog/overview.html
- API License Agreement: https://edp.ebay.com/join/api-license-agreement
- Application Growth Check: https://edp.ebay.com/grow/application-growth-check

Classifieds и retail:
- Marktplaats API: https://api.marktplaats.nl/docs/v1/advertisements.html
- OLX Group: https://developer.olxgroup.com
- Finn: https://www.finn.no/api/getting-started
- Tradera: https://api.tradera.com
- Vinted ToS: https://www.vinted.com/terms_and_conditions
- Kleinanzeigen ToS: https://themen.kleinanzeigen.de/nutzungsbedingungen/
- Allegro API issues: https://github.com/allegro/allegro-api/issues/4213
- Back Market API: https://api.backmarket.dev
- Rebuy Awin: https://ui.awin.com/merchant-profile/13115
- PriceCharting ToS: https://www.pricecharting.com/page/terms-of-service
- RecommerceIQ index: https://www.recommerceiq.com/market-index/buyback-prices

Legal:
- Ryanair v PR Aviation C-30/14: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62014CJ0030
- CV-Online Latvia v Melons C-762/19: https://ipcuria.eu/case?reference=C-762%2F19
- Leboncoin scraping: https://cms.law/fr/fra/news-information/arret-leboncoin-web-scraping-droit-sui-generis-sur-les-bases-de-donnees

Costs:
- Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Claude vision tokens: https://platform.claude.com/docs/en/build-with-claude/vision
- EAN-Search API: https://www.ean-search.org/ean-database-api.html
- opengtindb: https://opengtindb.org/
- ECB rates: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
