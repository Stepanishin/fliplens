# Benchmark dataset and evaluation plan

A repeatable test set. Every change to pricing or recognition is run through it before merge.

## Composition (100 products)

| Category | Count | Example subcategories |
|---|---|---|
| electronics | 30 | headphones 8, smartphones 7, tablets 4, smartwatches 4, speakers 3, laptops 2, streaming/routers 2 |
| gaming | 25 | consoles 8, handhelds 4, controllers 5, games (boxed, with EAN) 6, retro 2 |
| cameras | 25 | mirrorless bodies 7, DSLR bodies 5, lenses 9, action cams 2, compacts 2 |
| tools | 20 | drills/drivers 8, saws 4, measuring 3, batteries/chargers 5 |

Deliberately include **hard pairs** (they test matching, not luck):
- Sony WH-1000XM3 / XM4 / XM5
- Nintendo Switch v1 / v2 / OLED / Lite
- iPhone 13 / 14 / 15 Pro with different storage
- Canon RF 24-105 / EF 24-105, Sony FE vs E-mount APS-C
- AirPods Pro 1 / 2 (Lightning / USB-C)
- PS5 disc / digital / Slim
- Makita / DeWalt body-only vs kit

## Format

`eval/dataset/items.jsonl`, one line per product, schema in `eval/dataset/item.schema.json`. Photos in `eval/dataset/images/<id>/1.jpg`.

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

`market_range_eur` is collected manually from sold data (eBay sold filter in the browser, CEX/Rebuy buy and sell prices, MPB for cameras) as of the `captured_at` date. This is ground truth, not what our pipeline returns.

## Photos

- Real conditions: in hand, store shelf, poor light, partial frame, with and without the box.
- Do not use manufacturer press/stock photos.
- `photo_context`: `in_hand_shop_light`, `on_table`, `boxed`, `label_visible`, `poor_light`.

## Metrics

### Identification
- **exact**: brand + model + generation + variant match (capacity, if it affects price).
- **near_exact**: correct model, wrong or undetermined non-essential attribute (colour).
- **wrong**: anything else. Also `in_top3` for the candidate list.
- Calibration: accuracy by confidence bin (0.5-0.7, 0.7-0.85, 0.85+).
- Gate: exact + near_exact > 80% for Tier 1.

### Comparable retrieval
- `included_count` per product; share of products with >= 5.
- Filter precision: manual labeling of 20 random products × all their comparables (relevant / not). Target precision >= 90% among included.
- Distribution of exclusion_reason.

### Pricing
- `abs_pct_error = |expected - mid(market_range)| / mid(market_range)`.
- `in_range`: expected is within [low, high].
- Metrics: median APE, share in range, share with error > 50%.
- Gate: share of errors > 50% below 10%, median APE < 20%.
- Reported separately for sold-based and asking-based estimates (calibration of asking_to_sold_ratio).

### Decision
- For each product, the decision at the hypothetical purchase price is compared with the decision computed from the ground truth market range. False STRONG BUYs count as the most expensive error.

### Cost and latency
- Average cost and p50/p95 latency for identify and valuation.

## How to add products

In the app: photograph the item, correct brand/model/condition/price in the form, open **Add to benchmark**, enter the range of real sales (low/high), and save. The entry goes into `eval/dataset/items.jsonl`, photos into `eval/dataset/images/<id>/` (photos are not committed to git).

## Running

```text
pnpm eval                                     # all products, models gpt-6-sol and gpt-6-luna, pricing via eBay
pnpm eval -- --models gpt-6-luna --limit 10
pnpm eval -- --skip-vision                    # pricing only (no OpenAI costs)
pnpm eval -- --skip-pricing --only el-003
```

Report: `eval/reports/<timestamp>.md` (committed) and `<timestamp>.raw.json` (not committed). The report contains: recognition accuracy by model and category, confidence calibration, pricing error, share of errors > 50%, false STRONG BUYs, the suggested asking→sold ratio, cost per scan.

Recognition counts as correct if the candidate would pass as a comparable for the right product (the same matcher as in pricing): XM5 instead of XM4 or 256GB instead of 128GB = wrong.
