# Catalog

Phase 4 product discovery shares `DiscoveryScreen` across Catalog and Search.
Routes only parse navigation intent. The feature hook owns ephemeral query,
category, filter and sort state. Returning from Product preserves the mounted
discovery screen and scroll position. AsyncStorage persists only the six most
recent submitted/committed searches and grid/list preference.

## Data boundary

`ProductRepository.searchProducts(CatalogRequest)` returns `{ items, total,
nextOffset }`. The request contains selected store, commerce group/subcategory, query, category, filters,
promotion, sorting, offset and limit. `useCatalog` forwards cancellation signals
and keys its cache by the whole request. There is no fixture import or product
filtering in UI code. The mock adapter implements search and filtering; a backend
adapter can replace it without screen changes. `catalogMetadata` supplies brewery
choices and the actual represented subcategories for each commerce group independently,
so metadata failure does not block browsing. Older injected adapters may omit the
optional commerce taxonomy while migrating; UI never fills it with fictional categories.

The canonical collection links use `/catalog?group=onTap|bottled|snacks|other`,
with optional `subcategory`. Products carry explicit `commerceGroup` and
`commerceSubcategory` repository fields. The mock adapter classifies its existing
32 products using serving/category fields and explicit snack records; titles
never determine collection membership. The empty `other` group adds no products.

Results use FlatList. Pages contain up to 36 items with an explicit "show more"
action when an adapter supplies another offset. The 32-item fixture fits one page;
there is no automatic infinite-scroll machinery or assumed final catalog size.

## Semantics

- Categories are declared once in `model.ts` and shared with Home.
- Filters combine with AND; values within a multi-select group combine with OR.
- Search normalizes Unicode/case and matches every whitespace-separated word
  across name, description keywords, style (including Ukrainian label) and brewery.
- ABV and price presets use inclusive lower and exclusive upper bounds.
- Alcohol-free means a known ABV of 0–0.5%; missing ABV never implies zero.
- IBU is low below 25, medium from 25 to below 50, high from 50. Unknown IBU
  does not match a bitterness filter; `getBitternessLevel` is the single mapping.
- `storeOffers` is authoritative when present. A missing store offer is
  unavailable. Legacy products fall back to `storeIds` plus base availability.
  Optional offer prices override the base price, including filtering and sorting.
- With a selected store, available items sort first. The chosen sort applies
  within each stock group, with a stable ID tie-breaker. Missing ABV sorts last.
- Promotion IDs apply active date and store restrictions as well as membership.
- On-tap collection results require the selected store, available parent stock,
  and at least one available draft serving variant. Home's available draft list
  uses the same eligibility rule. Other groups remain browsable without a store;
  adding asks the user to choose one.
- Changing group clears its subcategory and detailed category while retaining
  search, applied filters, promotion and sorting. Detailed category chips and
  filter controls remain available within every commerce group.
- Filter edits are a modal draft. Apply commits; close discards; reset clears the
  draft. Individual chips remove one condition. Clear-all also clears category
  and promotion while retaining the commerce group, query and sort.

## Responsive and verification

Grid uses two columns at 380px and above inside the existing 430px shell. Narrow
screens and large font scales use one column. List mode reuses the compact card.
The modal header/footer remain visible while its contents scroll.

See `docs/phase-4-verification.md` for checks and runtime limitations.
