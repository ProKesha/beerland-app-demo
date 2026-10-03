# Store discovery

Phase 7 shares `useStores` and the injected `StoreRepository` across map/list discovery and the existing picker. `useStoreDetail` queries one location by ID and reuses the existing available-product and draft-product repository filters. Static store paths are discovered through the same repository composition point.

`useSelectedStore` remains the only active-store state. Marker highlight is only a preview. `useStoreSelection` extracts the Phase 6 cart confirmation; the existing Home/Catalog/Product/Checkout picker and both new screens use it. An explicit confirmation validates and transfers cart lines; unavailable or over-limit lines remain visible and block checkout. See `docs/phase-8.5-verification.md`. Catalog/product shortcuts select through that flow before navigating. The catalog route carries draft and available-only filters while its store comes from global state.

The weekly schedule is an array of intervals (ISO weekdays 1–7). Missing days are closed; repeated days support split shifts; close earlier than open means overnight. Equal endpoints are an empty interval, not 24-hour opening. Status is derived in the store timezone, defaulting to Europe/Kyiv. Temporary closure overrides the schedule. UI status and map marker status refresh every 30 seconds. Legacy optional `isOpen` input is accepted for compatibility but is never consulted by the UI or populated in mocks.

The model also supports optional timezone, temporary closure, slug, image, features, description and store code. Existing demo locations retain their IDs and remain explicitly fictional. Demo 2 has different hours and no delivery; Demo 3 is temporarily closed. No invented phone number is published.

## Map boundary

`SafeStoreMap` catches rendering failures. `StoreMap.web.tsx` hosts a sandboxed iframe; `StoreMap.tsx` is the native Expo SDK 57 WebView adapter. Both host the isolated MapLibre GL JS 5.6.2 / OpenFreeMap document. Features depend only on `StoreMapProps`. Provider-specific code and URLs are confined to `map/`.

OpenFreeMap uses OpenStreetMap data, requires no key, and permits commercial use. Map attribution comes from the style. The native WebView was installed with `expo install`; no location permission or paid provider configuration is required. Scripts, style and tiles require network access and native WebGL support. Error events, WebView failures, WebGL loss, render failures and startup timeouts expose the list fallback. List mode is the persisted default. Selection/status changes update existing markers without recreating the map or losing its viewport.

`StoresScreen` accepts optional location coordinates. Haversine distance and sorting run locally; absence of location hides distance. There is deliberately no geolocation request in this phase. A future permission-aware location hook can provide coordinates without changing repositories/cards. Search and city filtering are deferred for the current three-record dataset.

References: [Expo 57 WebView](https://docs.expo.dev/versions/v57.0.0/sdk/webview/), [OpenFreeMap](https://openfreemap.org/), [provider quick start](https://openfreemap.org/quick_start/).
