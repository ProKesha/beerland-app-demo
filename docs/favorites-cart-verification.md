# Favorites and clear-cart verification

Verified on 2026-10-03. Implementation, automated checks and Web runtime checks
are complete. iOS and Android runtime verification remains open.

## Behavior

- Mobile shop headers expose a heart button for `/favorites`; desktop keeps the
  labeled favorites link. The existing profile entry also remains available.
- Favorites have a dedicated responsive product grid, store selection, product
  navigation, current cart controls, immediate removal and recoverable loading,
  empty, error and missing-product states. Repository queries wait for hydration;
  each product is cached independently. Repeated removal cannot re-add a product.
- Nonempty hydrated carts expose `Очистити кошик` even while prices are loading
  or unavailable. Confirmation clears the persisted cart; cancellation preserves
  it. The badge, checkout action and empty state update immediately. An old
  confirmation cannot clear a different session's cart, and clearing during a
  price recheck prevents checkout navigation.
- Retained favorite and product quantity callbacks cannot change the cart after
  session replacement or before session hydration. Product failures expose a
  retry action even when another favorite product is still loading.

## Automated checks

- `npm run typecheck` and `npm run lint`: passed.
- Final `npm test -- --silent`: 1,246 tests passed in 104 iOS/Android suites.
- `npm run format:check` and `git diff --check`: passed.
- `EXPO_OFFLINE=1 npm run export:web -- --max-workers 2`: passed.
- `EXPO_OFFLINE=1 npm run export:ios -- --max-workers 2`: passed.
- `EXPO_OFFLINE=1 npm run export:android -- --max-workers 2`: passed.

New component tests cover confirmation/cancellation, persistence, badges,
hydration, loading/errors, pending checkout, session replacement, favorites
removal, repository retries, selected-store availability and product navigation.
Router tests exercise Catalog → Favorites → back and clearing the real cart tab
badge. Test repositories and QueryClients are injected and isolated.
Final review added regressions for retained add/quantity callbacks after owner
replacement, both hydration transitions, and mixed pending/failed product queries.

## Web runtime

The final optimized export was served through the existing loopback preview on a
fresh origin, `http://127.0.0.1:4197`, with prepared static font/image assets.

- Checked favorites at widths 320, 390, 740, 768, 1024 and 1440 px. The narrow
  layout uses one column, regular phones two, tablets three and wide screens four;
  measured document width did not overflow the viewport.
- Confirmed empty-state catalog navigation, saving three products, store
  selection, stock-aware disabled buttons, adding a favorite to cart, changing
  draft volume, opening Product Detail and returning to Favorites.
- Removed a favorite using Enter and reloaded `/favorites`; the remaining saved
  products and cart volume were retained.
- Canceled clear-cart confirmation and verified the cart and checkout action
  remained. Confirmed clearing, then reloaded `/cart`; the empty state remained
  and the real tab badge disappeared.
- Browser warning/error logs were empty.
- Repeated the final cart/favorites smoke check after the review fixes at 390 px;
  confirmed persistence, cancellation, clearing, badge removal and available cart
  controls on returning to favorites. Rechecked no document overflow at 320 and
  1440 px. Final browser warning/error logs were empty.

## Native runtime gap

`xcrun simctl` is unavailable and Android `adb` is not installed. Jest platform
presets and successful native bundle exports do not replace a device or simulator
check. Before calling the feature
fully verified on mobile, check the same favorite/cart flows on iOS and Android,
including safe areas, increased text size, dialog dismissal and persisted state
after restarting the app. No E2E framework was added; stable interaction testIDs
remain available for future Maestro flows.
