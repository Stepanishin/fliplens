# Data Sources

Living registry of sources. Full analysis: [FEASIBILITY_REPORT.md](FEASIBILITY_REPORT.md). Updated 2026-09-23.

## Access type priority

```text
official API > licensed commercial feed > affiliate API/feed > permitted public data > scraping (only if legal and contractually permitted)
```

We do not build the core on undocumented/private endpoints or reverse engineering of authenticated APIs. If rights are unclear, the source is not production-ready.

## Statuses

`production` allowed in the product | `research` internal eval only | `pending` awaiting legal/BD | `rejected` do not use

| Source | Status | Reason |
|---|---|---|
| eBay Browse API | research (production keyset active since 2026-09-28); closed beta allowed under Public Display rules, paid launch after confirmation from eBay/legal | License: 6h freshness, delete ended, no co-mingling, no ML training; consent required for category-level average selling price and Restricted APIs (not Browse). Search with `category_ids` (IDs shared across DE/FR/IT/ES/NL), see `packages/sources/src/ebay.ts` |
| eBay Catalog API | research | Identity by GTIN; check the same license |
| eBay Marketplace Insights | pending (BD) | Closed to new users |
| eBay Sell APIs (the user's own data) | pending | Import of the user's own sales via OAuth |
| Tradera API | pending | Legal review of API Terms |
| Rebuy, Back Market, Rakuten FR, MPB (Awin) | pending | Check affiliate program terms and feed contents |
| idealo affiliate | pending | New price anchor |
| PriceCharting | pending | Commercial license needed for display |
| Keepa | research | Rights to display Amazon data not verified |
| EAN-Search.org | pending | Check caching terms |
| opengtindb | production candidate | GNU FDL, attribution |
| Open Icecat | pending | Possible restrictions on AI use |
| ECB FX | production | Free, reference rates |
| Vinted, Kleinanzeigen, Wallapop, Leboncoin, Subito, Willhaben, Bazos, Njuškalo, Bolha, FB Marketplace | rejected | No API, ToS prohibits automated access, database right |
| Allegro | rejected | ToS of 2025-09-23 prohibits price comparison use |
| Marktplaats, OLX, Finn API | rejected | Own listings only |
| CEX / webuy | rejected | Undocumented endpoints only |

## Legal document template per source

Before integration, create `docs/sources/<source>.md`:

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

## Architectural implications of the eBay license

- `marketplace_listings` for eBay: TTL 6 hours, deletion when status is ended. Do not build a historical archive of eBay listings.
- `price_snapshots` for eBay only within the lifetime of the listing.
- `market_snapshots` based on eBay: TTL <= 24 hours, with the data age displayed.
- Comparables screen: the eBay block is visually separated from other sources.
- No ML training on eBay content. Calibration (ratio, multipliers) is done on our own ground truth and user data.
