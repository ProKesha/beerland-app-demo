# Home

Home composes injected repository data through `useHomeData` and navigation/cart/store actions through `useHomeActions`. Editorial, catalog, tap-list and reorder sections use the selected store and current owner context; UI never imports mock fixtures.

Four commerce collection entries navigate to the canonical filtered catalog:
on tap, bottled/canned drinks, snacks, and other products. The existing detailed
category row remains available. Collection entry labels are Ukrainian and reuse
Beerland's tokens and accessible controls; the full-width rows fit narrow screens.
Tap-list and snack section links use the same commerce routes. Temporarily closed
or unfulfillable stores keep products browsable and block purchase/reorder actions.

Store switching reuses the shared selection/transfer flow. Missing recommendations do not invent content or block discovery. See [the project README](../../../README.md) and [Phase 10 verification](../../../docs/phase-10-verification.md) for current scope and demo/native limitations.
