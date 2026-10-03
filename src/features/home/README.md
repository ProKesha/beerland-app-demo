# Home

Home composes injected repository data through `useHomeData` and navigation/cart/store actions through `useHomeActions`. Editorial, catalog, tap-list and reorder sections use the selected store and current owner context; UI never imports mock fixtures.

Store switching reuses the shared selection/transfer flow. Missing recommendations do not invent content or block discovery. See [the project README](../../../README.md) and [Phase 10 verification](../../../docs/phase-10-verification.md) for current scope and demo/native limitations.
