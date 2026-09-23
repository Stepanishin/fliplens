# Benchmark dataset и план оценки

Repeatable test set. Каждое изменение pricing или recognition прогоняется через него до merge.

## Состав (100 товаров)

| Категория | Кол-во | Примеры подкатегорий |
|---|---|---|
| electronics | 30 | headphones 8, smartphones 7, tablets 4, smartwatches 4, speakers 3, laptops 2, streaming/routers 2 |
| gaming | 25 | consoles 8, handhelds 4, controllers 5, games (boxed, с EAN) 6, retro 2 |
| cameras | 25 | mirrorless bodies 7, DSLR bodies 5, lenses 9, action cams 2, compacts 2 |
| tools | 20 | drills/drivers 8, saws 4, measuring 3, batteries/chargers 5 |

Специально включить **трудные пары** (они проверяют matching, а не удачу):
- Sony WH-1000XM3 / XM4 / XM5
- Nintendo Switch v1 / v2 / OLED / Lite
- iPhone 13 / 14 / 15 Pro с разной памятью
- Canon RF 24-105 / EF 24-105, Sony FE vs E-mount APS-C
- AirPods Pro 1 / 2 (Lightning / USB-C)
- PS5 disc / digital / Slim
- Makita / DeWalt body-only vs kit

## Формат

`eval/dataset/items.jsonl`, одна строка на товар, схема `eval/dataset/item.schema.json`. Фото в `eval/dataset/images/<id>/1.jpg`.

```json
{
  "id": "el-001",
  "category": "headphones",
  "truth": {
    "brand": "Sony",
    "family": "WH-1000X",
    "model": "WH-1000XM4",
    "variant": null,
    "capacity": null,
    "colour": "black",
    "gtin": "4548736112100"
  },
  "condition": "good",
  "images": ["images/el-001/1.jpg", "images/el-001/2.jpg"],
  "photo_context": "in_hand_shop_light",
  "hypothetical_purchase_price_eur": 55,
  "market_range_eur": { "low": 90, "high": 120, "kind": "sold", "captured_at": "2026-09-25" },
  "reference_urls": ["https://www.ebay.de/..."],
  "difficulty": "hard_pair",
  "notes": ""
}
```

`market_range_eur` собирается вручную из sold данных (eBay sold filter в браузере, CEX/Rebuy buy и sell цены, MPB для камер) на дату `captured_at`. Это ground truth, а не то, что вернёт наш pipeline.

## Фото

- Реальные условия: рука, полка магазина, плохой свет, частичный кадр, коробка и без коробки.
- Не использовать press/stock фото производителя.
- `photo_context`: `in_hand_shop_light`, `on_table`, `boxed`, `label_visible`, `poor_light`.

## Метрики

### Identification
- **exact**: brand + model + generation + variant совпали (capacity, если влияет на цену).
- **near_exact**: правильная модель, неверный или неопределённый несущественный атрибут (colour).
- **wrong**: иначе. Также `in_top3` для списка кандидатов.
- Calibration: accuracy по бинам confidence (0.5-0.7, 0.7-0.85, 0.85+).
- Gate: exact + near_exact > 80% для Tier 1.

### Comparable retrieval
- `included_count` на товар; доля товаров с >= 5.
- Precision фильтра: ручная разметка 20 случайных товаров × все их comparables (relevant / not). Цель precision >= 90% среди included.
- Распределение exclusion_reason.

### Pricing
- `abs_pct_error = |expected - mid(market_range)| / mid(market_range)`.
- `in_range`: expected внутри [low, high].
- Метрики: median APE, доля в range, доля с ошибкой > 50%.
- Gate: доля > 50% ошибок < 10%, median APE < 20%.
- Отдельно для sold-based и asking-based оценок (калибровка asking_to_sold_ratio).

### Decision
- Для каждого товара decision при hypothetical purchase price, сравнение с decision, вычисленным по ground truth market range. Ложные STRONG BUY считаются самой дорогой ошибкой.

### Cost и latency
- Средняя стоимость и p50/p95 latency на identify и valuation.

## Скрипты (Phase 0/1)

```text
pnpm eval:identify   прогон фото через VisionProvider, отчёт в eval/reports/identify-<date>.md
pnpm eval:comps      поиск comparables через adapters, отчёт retrieval
pnpm eval:pricing    полный valuation, сравнение с market_range
```

Отчёты коммитятся, чтобы видеть регрессии между версиями алгоритма.
