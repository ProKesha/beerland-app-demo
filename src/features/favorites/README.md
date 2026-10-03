# Favorites

`FavoritesScreen` is the dedicated shop collection at `/favorites`. It uses the
existing persisted favorites store shared with Catalog, Home and Product Detail,
alongside the shared shop header, banner, product cards and cart controls. The grid adapts to
the available safe-area width: one column below 380 points, two on normal phones,
three on tablets and four on wide screens. Increased text size uses one column.

`useFavoriteProducts` reads product details through injected repositories and
independent React Query entries. Both products and stores wait for persistence
hydration. Removing a favorite immediately removes its card without reloading
the remaining products. Missing products remain visible as removable entries;
loading, empty and retry states are explicit.

`useFavoriteActions` removes saved IDs and delegates purchases to the shared
`addProductToCart` service. Purchases use the selected store's offers and limits,
and an absent selected store opens store selection. Removal checks the current
hydration state and session owner and is safe against repeated taps.

Behavior coverage lives in `src/__tests__/favorites-screen.test.tsx`, alongside
the shared account and navigation regression tests.
