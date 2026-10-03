# Product Detail — Phase 5

`/product/[id]` is a thin route. `useProduct` fetches a single ID through the injected `ProductRepository`, with cancellation, loading, retry and not-found states. The detail screen never loads or searches the catalog. `useProductPurchase` owns variant/quantity/store selection and purchasing guards.

## Variants and inventory

`ProductVariant` contains a stable ID, structured volume/unit, serving type, base price, optional previous price, availability, optional maximum quantity, and optional store offers. Product-level availability is an upper bound; explicit variant store inventories fail closed for missing stores. Store offers override variant prices and limits. The canonical `default` variant also inherits the existing product store-price override so cards and detail agree.

The first variant is the card's default purchasable SKU; its volume and base price must match the product summary. Products without explicit variants receive a derived `default` SKU. Existing `image` supports remote HTTPS images, registered local images and the styled missing-image fallback. No products have multiple photos, so no gallery dependency is introduced.

Cart identity is `(productId, storeId, variantId ?? 'default')`. Older persisted lines remain valid and merge with explicit default lines. `setQuantity` and `removeItem` accept an optional final variant ID and target only that SKU. Detail quantities respect order limits including units already in cart. The shared card action now checks the default variant's inventory and limit; no Catalog/Search/Home rendering or querying was replaced.

## Recommendations

`ProductRepository.recommendations(id, storeId, options)` returns bounded pairing and related arrays. The mock adapter resolves curated pairing references (or snack fallback), excludes missing/current/unavailable items and ranks related items by category, brewery and flavor tags. Query caching is keyed by product and store; recommendation computation is outside rendering. Failure has an independent retry and never blocks the primary product.

## Layout and scope

The header and purchase bar are normal, non-shrinking siblings of one vertical ScrollView. The purchase bar reserves its actual height and applies the bottom safe inset once. This prevents overlap without a device-specific guessed spacer. Recommendations scroll horizontally. Back uses navigation history, with a catalog fallback only when history is absent.

Eight existing fictional products receive structured variants and original descriptions/tasting notes. No public production URLs, invented brewery histories, age-verification flow, sharing or recently-viewed persistence were added. These optional features remain outside Phase 5.

Production adapters must provide stable variant IDs and revalidate prices/stock server-side when checkout is implemented. Runtime verification and responsive evidence are recorded in `docs/phase-5-verification.md`.
