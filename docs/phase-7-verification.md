# Phase 7 verification

## Delivered

- Repository-backed Stores tab with persistent map/list preference, selected-first ordering, compact cards, active-store indicator and loading/error/empty states.
- Store Detail at `/store/[id]`, including static web paths for all repository locations, identity, address, current status, capabilities, weekly hours, four available draft products, four available popular products, catalog shortcuts, conditional phone action, directions and map.
- Existing single selected-store Zustand state retained. Phase 6 cart confirmation is extracted into one shared hook; Home, Catalog, Product Detail, Checkout, Stores and Store Detail all use that flow. Cancel preserves cart and active store. Catalog/product shortcuts wait for selection confirmation before navigation.
- Home and Checkout's shared store card links to Store Detail. Existing catalog/product picker UIs remain shared; no broad screen redesign.
- Timezone-aware derived status with temporary closure, closed days, multiple intervals and overnight support. Optional store metadata and local Haversine distance support. No user-location permission request.

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm test`: 586 passing tests across 46 iOS/Android Jest suites. This retains 524 prior executions and adds 62. The existing navigation test's heading expectation was updated for the requested Stores title; its repository count assertion is retained. No existing tests were removed or weakened.
- `npm run export:web`: passed, including `/store/store-1`, `/store/store-2`, `/store/store-3`.
- Native JavaScript/Hermes exports for iOS and Android: passed. These are bundling checks, not native builds or runtime verification.

New coverage: injected repository loading/retry/empty/not-found; map data/preview/list switching/failure fallback; selection and cart cancellation/confirmation; hydration gating; open/closed cards and capabilities; timezone, winter offset, boundaries, split and overnight intervals; available store/draft/popular assortment; catalog context/filters; distance and sorting; phone/direction links and Linking errors; escaped map data; no raw-fixture imports in Stores UI. Existing Home, Catalog, Product, Checkout and navigation suites exercise the shared-picker integration.

## Browser verification

Reviewed the local Expo web app at 320×568, 390×844, 430×932 and 1280×800. Checked list cards, map and preview, Store Detail, closed-store presentation, hours, compact product rows, action reachability and the cart confirmation sheet. DOM measurements showed document width equal to viewport width at all four sizes; visible buttons/maps stayed within the viewport. Desktop preserves the centered 430px shell. Tabbed content scrolls above the tab bar; detail directions remain reachable at the bottom.

Exercised map/list switching, persisted map preference after reload, marker-to-preview selection, zoom controls, detail navigation, and canceling a cart-conflicting selection with the cart badge unchanged. OpenFreeMap geography rendered at both network and street scales. A later detail-map resource/startup failure showed its address/directions fallback without breaking the screen. Unit/component tests also verify the discovery list fallback and retry path.

The initial Leaflet/OSM standard raster tile approach was replaced after visual review found an HTTP-success image containing an access-blocked message. The final provider is MapLibre GL JS 5.6.2 with OpenFreeMap, isolated behind iframe and Expo WebView adapters. OpenFreeMap requires no key and allows commercial use. Provider assets remain network-dependent and have no SLA; error/timeout fallback is intentional. See [OpenFreeMap](https://openfreemap.org/) and [Expo SDK 57 WebView](https://docs.expo.dev/versions/v57.0.0/sdk/webview/).

## Native runtime verification still required

`xcrun --find simctl` fails and `adb` is not installed in this environment. Native runtime is **not verified**.

On iOS:

- Rebuild/install with the SDK-compatible WebView dependency; verify WebGL map rendering, load failures and retry/list fallback.
- Verify marker taps, preview and selected/closed marker states, pinch/drag/zoom, VoiceOver and enlarged text.
- Check safe areas, keyboard/focus, cart confirmation and cancel, phone handler and Apple Maps directions.
- Confirm browsing never prompts for location; when a future location source is added, test denied/granted/revoked permissions and injected distances.

On Android:

- Rebuild/install with WebView; verify WebGL rendering, marker taps, pan/pinch/zoom and resource/process-failure fallback.
- Check system back from detail and confirmation, safe areas, TalkBack and enlarged text.
- Check phone/geo intent handlers and unavailable-handler feedback.
- Confirm no location prompt; later test denied/granted/revoked permissions with the location source.

## Deviations and prerequisites before Phase 8

- Native uses a WebView-hosted open map instead of a platform maps SDK to keep the demo key-free and provider-replaceable. Native performance and platform behavior still need the checks above.
- Location acquisition, search and city filters are deferred: optional coordinate injection is implemented; three demo stores do not justify more controls.
- All published mock phones remain null rather than presenting an invented real contact. Phone rendering/actions are tested through injected records.
- Backend, real branch data, inventory authority and production map availability/hosting remain future integration work. The optional legacy `isOpen` input is retained for adapter compatibility, but no UI relies on it.
- Phase 8 has not been started.
