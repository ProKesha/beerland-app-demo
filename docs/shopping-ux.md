# Shopping UX: cart positions, serving controls and commerce groups

## Cart identity and feedback

Previously, navigation summed integer quantities, so two portions of one serving appeared as two positions. Cards always offered Add; serving selection lived in Product Detail, and Cart edited integer portion counts. Discovery used detailed product categories without an explicit commerce group.

The badge counts distinct positive cart positions by `(productId, variantId ?? 'default', storeId)`. Integer quantity, volume, weight and money do not contribute to the count. The cart store is the only source; tabs and the existing desktop header share its selector, Ukrainian accessibility wording and `99+` visual cap. Checkout clearing, persistence hydration, removal and store transfer update the selector naturally.

## Fast quantities

Product cards delegate the first add to the existing shopping action hook. Once present in the selected store's cart, a compact shared `QuantityControl` replaces Add. Its mutations re-read live state on every event, including events from multiple mounted cards of the same product.

Draft controls move through sorted repository serving IDs. Unavailable servings are skipped, the next size is disabled when its quantity limit would be exceeded, and decrementing the smallest available serving removes that position. Existing integer multiplicity is preserved: `2 × 0,5 л` becomes `2 × 1 л`. If the destination variant already exists, its count is merged only within its limit. Other variants remain visible through a secondary hint and can be edited separately in Cart.

Cart retains the original integer portion count and adds a draft serving control. This preserves existing quote, checkout, reorder, transfer and persistence contracts. Packaged controls adjust integer pieces; package volume stays separate. Measured snacks retain exact repository servings such as `100 г` or `2 × 100 г`. Shared formatters honor an explicit `sellingUnit`; no price is converted or invented. All prices remain integer minor currency units.

## Commerce taxonomy and routes

`commerceGroup` explicitly classifies products as `onTap`, `bottled`, `snacks` or `other`. `commerceSubcategory` identifies repository-owned subcategories. Catalog metadata supplies only represented subcategories; the UI never reads fixtures or parses product names. Legacy unclassified products safely default to `other`.

Home provides four entries using the existing card, button, type and color tokens. Canonical `/catalog?group=…` intents use the existing discovery screen, preserve detailed categories, search, filters, sorting and list/grid mode, and reset subcategory selection when switching groups. On-tap results require a selected store and an available draft offer. Changing store updates inventory and price through the existing repository/query architecture. The current demo has no merchandise in `other`; it shows an honest empty state.

## Future container selection

No container charges, deposits or packaging rules are introduced. A future authoritative packaging option can extend the variant/offer contract with a stable packaging identity and explicit price, stock and quantity constraints. If independently selectable packaging is introduced, its identity must participate in cart keys, persistence migration, transfer validation, quotes and order lines. It must not be encoded in product titles or silently added to draft prices.

Beerland still needs to approve authoritative selling units, packaging identities/fees (if any), stock limits and future merchandise. Current measured snack servings and fictional catalog prices remain demo conventions.

## Verification

Verification date: 2026-10-03. Commands ran against the final shopping implementation, including the Favorites availability and browser search-focus fixes.

| Check                                                                          | Result                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `npm run typecheck`                                                            | Passed                                                         |
| `npm run lint`                                                                 | Passed                                                         |
| `npm test`                                                                     | Passed: 1176 checks / 96 suites, zero snapshots                |
| `npm run format:check`                                                         | Passed                                                         |
| `npm run export:web -- --max-workers 2 --output-dir .expo/shopping-export-web` | Passed                                                         |
| `npm run export:demo -- --max-workers 2`                                       | Passed                                                         |
| Final demo export after the focus fix                                          | Passed; staged export promoted to `dist` for the local preview |
| `git diff --check`                                                             | Passed                                                         |
| Netlify, host assets, dependency and app configuration diff                    | Unchanged                                                      |

Exports used `EXPO_OFFLINE=1`; the existing demo exporter prepared static host assets. Browser checks used the exported owner demo through the existing loopback preview script.

| Viewport   | Browser result                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 320 × 568  | Four Home entries; valid draft stepping; packaged pieces; two cart positions; refresh persistence; store transfer; tabs and badge; no page overflow |
| 390 × 844  | Same shopping flow; two-column controls fit; four collection routes work; badge and persisted quantities agree                                      |
| 430 × 932  | Same shopping flow; package and serving quantities remain separate; stock/prices update after transfer; no page overflow                            |
| 1280 × 800 | Same shopping flow; existing desktop header cart uses the shared count; four-column cards fit; bottom tabs remain hidden as before                  |

At every viewport, a complete multi-character search retained focus and returned the correct snack inside its commerce group. Product Detail's purchase action stayed inside the viewport: 296/366/406/816 px wide respectively, with a 52 px height. Additional browser checks covered snack weights, independent favorites, fast controls in Favorites and recommendations, Product Detail opening/back navigation and the honest empty `other` collection. Browser warning/error logs were empty.

Browser verification found that per-character `scrollToOffset` dismissed the Web input because the installed React Native Web implementation dismisses the keyboard on scroll with `keyboardDismissMode="on-drag"`. Typing now preserves scroll/focus; explicit submit and collection/filter actions still reset results.

Native runtime verification remains open: `xcrun` is present but `simctl` is unavailable; Android `adb` and emulator are unavailable. Both Jest platform presets are checked, but no physical iOS/Android or simulator run is claimed. Native runtime validation is required before calling the feature fully verified on mobile.

Logs and browser evidence are under the ignored `.expo/shopping-*` paths. The final Web demo is in ignored `dist`.

No backend adapter, hosting rule, dependency upgrade, commit, push or manual deployment is part of this change.

## Regression coverage and changed areas

Four new source test files run under both iOS and Android Jest presets:

- `cart-badge.test.tsx`: canonical line identity, positive quantities, Ukrainian plurals, visual cap, shared header state, variant merging, hydration and transfer. Existing checkout/navigation suites verify clearing after checkout.
- `shopping-quantity.test.tsx`: valid draft sizes, unavailable gaps, equal-size aliases, integer packaged counts, selling units, rapid taps across mounted controls, stock limits, stale stores, hydration, closed stores, full-cart portion/serving races, merged target lines and persistence/transfer.
- `commerce-groups.test.ts`: explicit classifications, metadata, group/search/filter composition, actual draft stock, authoritative units and canonical route intents.
- `commerce-groups-ui.test.tsx`: repository injection, legacy metadata compatibility, group/subcategory selection, retained search/filter/sort/display state, store changes, empty collections and navigation.

The four new files add 92 source test cases (184 platform checks). Two further cases in existing account/discovery suites add four platform checks: Favorites can choose an eligible larger legacy serving, and search typing does not scroll/dismiss focus while explicit submission still resets results. This increases the baseline by 188 checks.

Existing navigation, checkout navigation, discovery and Product Detail tests were adjusted to assert line counts and explicit group routing. Two stock-switch scenarios inject an open store to isolate inventory changes from the separate closed-store condition; the new suite verifies closed-store blocking directly.

Implementation areas:

- Domain/repositories: `src/types/domain.ts`, `src/repositories/contracts.ts`, and mock classification, fixtures, details, repository metadata and search.
- Shared shopping state/UI: `src/stores/cartSelectors.ts`, `CartIcon`, `ShopChrome`, tabs and the extended `QuantityControl`.
- Product behavior: shared `cartActions`, `quantityFormat`, `useProductCartControl`, ProductCard, Product Detail purchase actions and recommendations.
- Discovery: catalog intent/model/state, commerce filters, Home commerce entries and Home action hooks.
- Cart: CartScreen, CartItemCard and ServingControl.
- Documentation: this report, the Home/Catalog feature READMEs and the root README link.

## Complete changed-file inventory

- `README.md`
- `app/(main)/(tabs)/_layout.tsx`
- `docs/shopping-ux.md`
- `src/__tests__/account-screens.test.tsx`
- `src/__tests__/cart-badge.test.tsx`
- `src/__tests__/checkout-navigation.test.tsx`
- `src/__tests__/commerce-groups-ui.test.tsx`
- `src/__tests__/commerce-groups.test.ts`
- `src/__tests__/discovery.test.tsx`
- `src/__tests__/navigation.test.tsx`
- `src/__tests__/product-detail.test.tsx`
- `src/__tests__/shopping-quantity.test.tsx`
- `src/components/common/CartIcon.tsx`
- `src/components/common/ShopChrome.tsx`
- `src/components/ui/QuantityControl.tsx`
- `src/features/cart/CartScreen.tsx`
- `src/features/cart/components/CartItemCard.tsx`
- `src/features/cart/components/ServingControl.tsx`
- `src/features/catalog/DiscoveryScreen.tsx`
- `src/features/catalog/README.md`
- `src/features/catalog/catalogIntent.ts`
- `src/features/catalog/components/CommerceGroupFilters.tsx`
- `src/features/catalog/model.ts`
- `src/features/catalog/useDiscoveryState.ts`
- `src/features/favorites/FavoritesScreen.tsx`
- `src/features/home/HomeScreen.tsx`
- `src/features/home/README.md`
- `src/features/home/components/CommerceGroupEntries.tsx`
- `src/features/home/hooks/useHomeActions.ts`
- `src/features/product/ProductDetailScreen.tsx`
- `src/features/product/cartActions.ts`
- `src/features/product/components/ProductCard.tsx`
- `src/features/product/components/ProductRecommendations.tsx`
- `src/features/product/quantityFormat.ts`
- `src/features/product/useProductCartControl.ts`
- `src/features/product/useProductPurchase.ts`
- `src/repositories/contracts.ts`
- `src/services/mock/commerceGroups.ts`
- `src/services/mock/fixtures.ts`
- `src/services/mock/productDetails.ts`
- `src/services/mock/repositories.ts`
- `src/services/mock/searchProducts.ts`
- `src/stores/cartSelectors.ts`
- `src/types/domain.ts`
