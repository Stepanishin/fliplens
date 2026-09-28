# Data Sources

Живой реестр источников. Полный анализ: [FEASIBILITY_REPORT.md](FEASIBILITY_REPORT.md). Обновлено 2026-09-23.

## Приоритет типов доступа

```text
official API > licensed commercial feed > affiliate API/feed > permitted public data > scraping (только если легально и по договору)
```

Не строим core на undocumented/private endpoints и reverse engineering authenticated API. Если права неясны, source не production-ready.

## Статусы

`production` разрешён в продукте | `research` только internal eval | `pending` ждёт legal/BD | `rejected` не использовать

| Источник | Статус | Причина |
|---|---|---|
| eBay Browse API | research (production keyset активен с 2026-09-28); closed beta допустима по правилам Public Display, платный запуск после подтверждения eBay/юриста | Лицензия: 6h freshness, delete ended, no co-mingling, no ML training; consent нужен для category-level average selling price и Restricted APIs (не Browse). Поиск с `category_ids` (ID общие для DE/FR/IT/ES/NL), см. `packages/sources/src/ebay.ts` |
| eBay Catalog API | research | Identity по GTIN; проверить тот же license |
| eBay Marketplace Insights | pending (BD) | Закрыт для новых пользователей |
| eBay Sell APIs (данные самого пользователя) | pending | Импорт собственных продаж пользователя по OAuth |
| Tradera API | pending | Legal review API Terms |
| Rebuy, Back Market, Rakuten FR, MPB (Awin) | pending | Проверить условия affiliate программ и состав feeds |
| idealo affiliate | pending | New price anchor |
| PriceCharting | pending | Нужна commercial license для display |
| Keepa | research | Права на display Amazon данных не проверены |
| EAN-Search.org | pending | Проверить caching terms |
| opengtindb | production candidate | GNU FDL, attribution |
| Open Icecat | pending | Возможные ограничения на AI use |
| ECB FX | production | Бесплатно, reference rates |
| Vinted, Kleinanzeigen, Wallapop, Leboncoin, Subito, Willhaben, Bazos, Njuškalo, Bolha, FB Marketplace | rejected | Нет API, ToS запрещает automated access, database right |
| Allegro | rejected | ToS 2025-09-23 запрещает price comparison use |
| Marktplaats, OLX, Finn API | rejected | Только собственные объявления |
| CEX / webuy | rejected | Только undocumented endpoints |

## Шаблон legal-документа для source

Перед интеграцией создать `docs/sources/<source>.md`:

```text
Source:
API / feed:
Access process:
Terms URL + version date:
Commercial use:
Redistribution / public display:
Caching / storage duration:
Retention / deletion duties:
Co-mingling rules:
AI / ML restrictions:
Rate limits:
Cost:
Legal risk (low/med/high):
Status:
Reviewed by / date:
```

## Архитектурные последствия лицензии eBay

- `marketplace_listings` для eBay: TTL 6 часов, удаление при status ended. Не строить исторический архив eBay listings.
- `price_snapshots` для eBay только в пределах жизни listing.
- `market_snapshots` на основе eBay: TTL <= 24 часа, с отображением возраста данных.
- Comparables screen: eBay блок визуально отделён от других источников.
- Никакого ML обучения на eBay content. Калибровка (ratio, multipliers) делается на собственном ground truth и данных пользователей.
