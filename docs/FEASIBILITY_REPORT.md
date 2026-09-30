# Feasibility Report (Phase 0, desk research)

Date: 2026-09-23. Status: desk research complete, empirical benchmark not yet run.

Confidence labels: **V** verified on the official page, **S** secondary source, **U** unverified. Links are in the "Sources" section.

---

## TL;DR

1. **There is currently no legal, open source of EU sold prices.** eBay Marketplace Insights is closed to new users (V), the Finding API was shut down on 2025-02-04 (V). C2C classifieds (Vinted, Kleinanzeigen, Leboncoin, Wallapop, Subito, Willhaben, OLX, Marktplaats, Facebook) do not give access to other users' listings and prohibit scraping (V/V~).
2. **The eBay Browse API is technically ideal** (all 11 EU sites, GTIN search, condition, country, free), **but the eBay license restricts our use case**: data no older than 6 hours, deletion after the listing ends, no mixing with non-eBay data in public display, and written permission is required to display data from which an average selling price can be derived (V).
3. **Technically, everything else is cheap and solvable**: vision ~$0.005-0.011 per scan, barcode lookup from €19/month, FX free (ECB). Unit economics at €9.99/month are not a problem.
4. **Recommendation: CONDITIONAL GO for Phase 1 (Data Prototype) as an internal research tool**, in parallel with a legal/BD track. **A closed beta is acceptable** if the Public Display rules are followed (see section 3, clarified 2026-09-28). **A paid launch** only after confirmation from eBay and legal.

---

## 1. Candidate data sources

| Source | Access type | Data | Sold | Verdict |
|---|---|---|---|---|
| eBay Browse API | Official API | Active listings, 11 EU sites, GTIN/ePID | No | Technically the best. License requires approval for a pricing tool |
| eBay Marketplace Insights | Restricted API | Sold over 90 days (DE, ES, FR, GB, IT) | Yes | Closed to new users (V). Only via BD |
| eBay Catalog API | Official API | Product identity by GTIN, ePID | n/a | Useful for identification (AU, CA, DE, ES, FR, GB, IT, US) |
| Tradera (SE) | Official SOAP API | Active listings, bids | Possibly (U) | Candidate after legal review of API Terms |
| Back Market | Affiliate (Awin) | Refurbished retail prices | No | Upper bound (ceiling) |
| Rebuy | Affiliate (Awin), product feeds (V~) | Selling prices of refurbished/used | No | Anchor for electronics/gaming/cameras |
| Rakuten FR | Affiliate (Awin) | New + used offers | No | Candidate |
| MPB | Affiliate (Awin/Skimlinks), feed not confirmed | Used cameras | No | Candidate, if a feed exists |
| idealo | Affiliate | New prices | No | New-price anchor |
| PriceCharting | Paid API | Games/consoles loose/CIB/new, PAL available | Unclear | Commercial license needed for public display (V) |
| Keepa | Paid API (€49+/month) | Amazon .de/.fr/.it/.es/.co.uk, used price history | No | Research. Check display rights |
| RecommerceIQ | Free index + paid platform | Smartphone buyback prices FR/DE/IT | Buyback | Research/partner |
| Allegro (PL) | Official API, search closed to new apps | Offers, popularity buckets | No | Do not use: ToS of 2025-09-23 prohibits price comparison (V~) |
| Marktplaats, OLX, Finn | Official API | Own listings only | No | Not suitable |
| Vinted, Kleinanzeigen, Wallapop, Leboncoin, Subito, Willhaben, FB Marketplace | No API | n/a | No | Do not use. Leboncoin has won court cases against scrapers |
| CEX / webuy | Internal JSON endpoints only | Buy/sell prices | n/a | Do not use (undocumented) |
| **Users' own data** | Our product + eBay Sell APIs (user OAuth) | Real purchase and sale prices | Yes | Main long-term source and moat |

## 2. Official API availability

- eBay: Browse (open, but Buy APIs are formally Limited Release with production via the eBay Partner Network, V), Catalog (open), Marketplace Insights (closed), Finding/Shopping (decommissioned 2025-02-04), Product API (decommissioned 2026-08-15).
- Tradera: SOAP API with AppId/AppKey.
- Other EU marketplaces: API only for managing one's own listings.

## 3. Commercial usage constraints

eBay API License Agreement (V, key points):
- listing data no older than 6 hours, other content no older than 24 hours, otherwise the age must be disclosed;
- delete eBay content when it is no longer publicly available (no accumulating a database of ended listings);
- in public display, eBay content must not be mixed with non-eBay content, and must be visually separated;
- express prior written permission is required for use that allows deriving an average selling price for an eBay category;
- Restricted APIs (pricing, market trends) for pricing tools only with written consent, and eBay receives a license to your tool;
- training ML/AI on eBay content is prohibited;
- eBay treats "content created or derived therefrom" as its own.

Interpretation, clarified 2026-09-28 against the full license text (requires a lawyer):
- The requirement "pricing tools only upon eBay's express prior written consent" applies to **Restricted APIs** (market trends, pricing, sales volumes: Marketplace Insights, etc.), not to the Browse API. We use Browse without Restricted APIs.
- The consent requirement for "Average selling price ... for any eBay category" concerns statistics **by eBay category** (and site-wide statistics). We compute an estimate for a **single item** from the **asking prices** of its listings, not an average selling price by category.
- Public Display is permitted "to promote eBay and enable Your Users to search and browse listings" with restrictions: delete what is no longer public; do not mix with non-eBay content; data no older than 6 hours (otherwise show the age); do not use eBay content for ML/AI training.
- **Conclusion:** showing eBay listings with links to eBay and per-item estimates based on them appears permissible if these rules are followed. This is not explicit permission, it is an interpretation. Gray area: "derivation" of aggregates and the general "commercialize" prohibition. Recommendation: follow the rules, which is sufficient for a closed beta; obtain confirmation from eBay and legal before a paid launch.

Other:
- PriceCharting: the API subscription is for "Internal Business Purposes" only (V).
- Open Icecat: open content license, possible restrictions on AI use (U), check before use.
- EU law: CV-Online v Melons (C-762/19) and Ryanair v PR Aviation (C-30/14) make scraping classifieds risky through both database right and ToS.

## 4. Sold vs active data availability

| Type | Legally available now |
|---|---|
| Active asking prices | Yes: eBay Browse (with license restrictions), Tradera |
| Sold prices (C2C) | No. Only eBay Marketplace Insights via BD, partner deals (Adevinta, Vend), or our own data |
| Refurbished retail (ceiling) | Yes: affiliate feeds Back Market, Rebuy, Rakuten |
| Buy-back (floor) | Partially: RecommerceIQ index (smartphones), the rest via partners |
| New price | Yes: idealo affiliate |

Implication for the pricing engine: v1 works on **asking prices + anchors** (refurb ceiling, new price, buyback floor). The asking-to-sold ratio is calibrated on manual ground truth from the benchmark, and later on users' real sales. The UI always states explicitly: "based on N active listings, asking prices".

## 5. Expected API costs

| Item | Cost | Per scan |
|---|---|---|
| Vision, OpenAI gpt-6-sol (selected, ADR-006) | $2 / $10 per 1M tokens | ~$0.005 per 1 photo (measured), ~$0.01 per 2 |
| Vision, OpenAI gpt-6-luna (candidate) | $0.1 / $0.5 | ~$0.0005 |
| Vision, OpenAI gpt-6-astra (fallback) | $10 / $50 | ~$0.03 |
| Full-res photo without resize | ~3x tokens | resize to 1280px on device |
| eBay Browse, Catalog | free, ~5k calls/day default (U), expandable via Growth Check | ~0 |
| Barcode: EAN-Search.org | €19/month for 5k, €39 for 50k | < €0.004 |
| Barcode: opengtindb (DE) | free, GNU FDL | 0 |
| FX: ECB | free | 0 |
| Affiliate feeds | free | 0 |
| PriceCharting | ~$49/month + commercial license (price unknown) | n/a |
| Keepa | €49-459/month | n/a |

Estimated variable cost per successful valuation: **€0.01-0.03** (vision + cached market snapshot). A Pro user with 100 scans/month: ~€1-3 variable cost at €9.99. A heavy reseller with 1000 scans: €10-30, so unlimited at €19.99 requires a fair use limit or barcode-first + cache hit rate > 50%.

Required: resize to ~1MP on device, barcode before vision, gpt-6-sol by default (or luna after the benchmark), astra only at low confidence.

## 6. Categories easiest to support

| Category | Identification | Data | Assessment |
|---|---|---|---|
| Gaming (consoles, boxed games) | Easy: EAN on the box, clear models | eBay many listings, Rebuy, PriceCharting PAL | **Best to start with** |
| Smartphones / tablets | Medium: model visible, capacity not visible in photo | eBay, Back Market, Rebuy, RecommerceIQ | **Good**, but capacity must be asked |
| Headphones, smartwatches | Medium: similar generations (XM3/XM4/XM5) | eBay, Rebuy, Back Market | Good |
| Cameras bodies | Medium: model printed on the body | eBay, MPB (feed?), Rebuy | Medium |
| Lenses | Hard: mount, versions (II, III), OSS/IS | eBay; MPB without API | Hard, defer to Tier 1b |
| Power tools | Hard: body-only vs kit, batteries | eBay, few refurb anchors | Tier 2, as in the specification |

Proposal: Phase 1 focus on **gaming + smartphones + headphones**, camera bodies second, lenses and tools after.

## 7. Benchmark approach

Details: [eval/README.md](../eval/README.md). In brief:
- 100 items (30/25/25/20), including hard variant pairs.
- Ground truth market range is collected manually from sold data (eBay sold search under our own account, Rebuy/CEX prices, MPB), with a date.
- Metrics: identification exact/near-exact/top-3 and calibration; retrieval (share of items with >= 5 comps, filter precision on manual labeling); pricing (median APE, in-range, share of errors > 50%); share of false STRONG BUY; cost and latency.
- Separate metrics for asking-based vs anchor-based estimates.

## 8. Main risks

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | eBay does not grant permission for pricing use | Medium-high | Critical | Request in writing now; in parallel affiliate anchors and own data; design the UI within "search and browse listings" |
| R2 | Asking prices poorly predict sold | Medium | High | Ratio calibration per category, anchors, honest labeling, lower confidence |
| R3 | No sold data, liquidity cannot be computed | High | Medium | "Liquidity data unavailable", later own data and active listing count as a proxy |
| R4 | Buy API production access requires ePN approval | Medium | High | Apply to ePN and Growth Check in the first week |
| R5 | eBay license prohibits storing ended listings and ML | High (fact) | Medium | Do not build a historical eBay archive; build the moat on users' own data |
| R6 | Variant confusion (XM4/XM5, RF/EF, capacity) | High | High | Rule-based variant matcher, barcode-first, clarifying capacity question |
| R7 | Heavy users are expensive | Low-medium | Medium | Cache, barcode-first, fair use |
| R8 | Affiliate feeds lack the needed fields or prohibit such use | Medium | Medium | Check Awin program terms before integration |

## 9. Recommended MVP data stack

**Strategy A (recommended for Phase 1): eBay asking + anchors + own data**
- Identity: barcode (EAN-Search / opengtindb) + eBay Catalog by GTIN, vision (OpenAI gpt-6-sol) for photos.
- Price: eBay Browse (all EU sites), separate eBay block in the UI, live fetch with TTL <= 6 hours.
- Anchors: Rebuy / Back Market affiliate feeds (refurb ceiling), idealo (new price).
- Own data: purchase and actual sale in the app, import of the user's own sales via eBay Sell APIs (user OAuth).
- Status: prototype. Public Display per license rules; confirmation from eBay and legal before a paid launch.

**Strategy B (in parallel, BD track): licensed sold data**
- eBay BD: Marketplace Insights + consent for a pricing tool.
- Partner requests: Adevinta (Leboncoin, Subito, Marktplaats, Willhaben), Vend (Blocket, DBA, Finn), Tradera, MPB, RecommerceIQ.
- PriceCharting commercial license for gaming.

**Strategy C (fallback, if A and B fail): assisted lookup + own data**
- The app identifies the item and builds deep links to sold/active search on eBay, Vinted, Kleinanzeigen, which the user opens themselves.
- Profit calculator on the price the user confirmed.
- Estimates from our own dataset as it grows.
- Weaker UX, but legally clean. Identification + profit engine are useful even so.

## 10. GO / NO-GO

| Phase 0 criterion | Status |
|---|---|
| Identification > 80% Tier 1 | Not measured. Requires a benchmark with photos |
| >= 5 relevant comps for most items | Likely yes for eBay (volume of EU listings), not measured |
| Pricing without systematic ±50% errors | Not measured; risk R2 |
| At least 1 source legally suitable for commercial use | **Conditionally.** eBay Browse is suitable for browse-like use; pricing aggregation requires consent |

**Decision: CONDITIONAL GO for Phase 1 Data Prototype** as an internal research tool (CLI, no public data display), to empirically close the three open criteria.

**NO-GO for mobile / public beta** until one of the following is met:
1. written eBay permission for pricing use (or access to Marketplace Insights);
2. another licensed price source with >= 70% benchmark coverage;
3. a deliberate choice of Strategy C.

---

## Blockers and immediate actions

| # | Action | Owner | Blocks |
|---|---|---|---|
| B1 | Register an eBay developer account, obtain a production keyset | user | Phase 1 fetch |
| B2 | Apply to the eBay Partner Network and Application Growth Check | user | Production Buy API |
| B3 | Letter to eBay developer relations/BD: product description, request for consent on pricing display and Marketplace Insights | user (draft prepared by the agent) | Public launch |
| B4 | OpenAI API key (done 2026-09-23) | user | Recognition spike |
| B5 | Collect 100 items with photos (real conditions) and manual sold ranges | user + agent (template ready) | All gate metrics |
| B6 | Legal review: eBay License, Awin programs, Tradera API Terms, Icecat license | lawyer | Production |
| B7 | Register with Awin, request Rebuy, Back Market, MPB feeds | user | Anchors |

## Assumptions

- Internal research use of eBay Browse data to verify feasibility (without public display) is compatible with the license. Confirm with a lawyer.
- asking-to-sold ratio 0.85-0.90 as a starting hypothesis, to be calibrated.
- The default Browse rate limit of ~5k/day is sufficient for the benchmark (100 items × 11 sites = 1100 calls per run).

## Sources

eBay:
- Browse OpenAPI: https://edp.ebay.com/api-docs/master/buy/browse/openapi/3/buy_browse_v1_oas3.json
- Supported marketplaces: https://edp.ebay.com/api-docs/buy/static/ref-marketplace-supported.html
- Browse filters: https://edp.ebay.com/api-docs/buy/static/ref-buy-browse-filters.html
- Buy API requirements: https://edp.ebay.com/api-docs/buy/static/buy-requirements.html
- Deprecation status: https://edp.ebay.com/develop/get-started/api-deprecation-status
- Catalog API: https://edp.ebay.com/api-docs/commerce/catalog/overview.html
- API License Agreement: https://edp.ebay.com/join/api-license-agreement
- Application Growth Check: https://edp.ebay.com/grow/application-growth-check

Classifieds and retail:
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
- OpenAI models and pricing: https://developers.openai.com/api/docs/models
- OpenAI vision: https://developers.openai.com/api/docs/guides/images-vision
- EAN-Search API: https://www.ean-search.org/ean-database-api.html
- opengtindb: https://opengtindb.org/
- ECB rates: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
