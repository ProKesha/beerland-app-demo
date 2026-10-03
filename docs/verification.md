# Foundation verification

## Phase 3 Home verification — 2026-09-16

Home implementation and responsive web review are complete. Native runtime verification remains outstanding; platform Jest presets do not substitute for device execution.

### Implementation

- Header, working store picker, persisted delivery/pickup selection, search entry, editorial promotion hero, horizontal categories, store-filtered on-tap carousel, popular products, own-brewery collection, promotions, compact snacks and conditional reorder.
- Reuses ProductCard, ProductImage, SectionHeader, modal, skeletons, error states, toast, favorites/cart stores and existing tab navigation. UI consumes injected queries, never raw fixtures.
- Added serving type and repository filters; validated promotions and their repository; stable store-scoped promotion queries refresh active dates every minute. Hydration gates prevent premature product queries.
- Added minimal `/search` and `/product/[id]` routes and catalog intent parsing. Product pages are generated for current repository IDs during static export.
- Primary failures expose retry. Independent on-tap failures expose a local retry; missing promotions/history and empty optional collections do not block Home.

### Automated checks

- TypeScript, ESLint, all Jest suites, Prettier and production web export pass.
- Jest: 97 scenarios on each iOS/Android preset, **194 passing executions across 24 suites**, no snapshots or console warnings in the final run. Phase 3 adds 21 scenarios (42 platform executions) to the prior 152.
- Home tests cover selection, fulfillment and unsupported methods, store-specific draft inventory, repository injection, hydration/loading, cart/favorites/toasts, UAH, navigation, retries, optional errors/empty data and reorder.
- Repository/state tests cover composed draft filters, promotion dates/store scope/cloning/cancellation, fulfillment persistence and validation, reorder eligibility, catalog intent and image sources.
- Real router tests cover Home add-to-cart updating the tab badge, product ID navigation and search forwarding. Existing tests retained.

### Browser review

Reviewed the production export at localhost:4176 at 390 × 844, 430 × 932, 1280 × 900 and additionally 320 × 740.

- Warm editorial hierarchy, Lora headings, Manrope body/UI, consistent cards and own-brewery accent inspected. Missing images show neutral fallbacks.
- Store selection, delivery selection, pickup-only store disabling delivery, cart add/toast/badge, synchronized favorites, persistence after reload, search submission, category parameters and product navigation exercised.
- Horizontal carousels remain inside their containers; keyboard focus can reach later cards. Bottom catalog CTA and disclosure remain above persistent tabs. At 320px compact card actions and all five tab labels remain usable.
- No document horizontal overflow at 320, 390 or desktop width. Desktop shell remains centered at 430px. No browser warning/error or hydration messages observed during the reviewed flows.

### Deliberate boundaries and remaining work

- Store status uses the repository's open/closed snapshot rather than inventing a closing time. Photos remain placeholders until real media exists. One active promotion occupies the hero; additional promotions form the separate section.
- Search, catalog and product detail remain explicit placeholders, as requested. Default history is empty; injected eligible history exercises reorder in tests.
- Rechecked native tooling: `xcrun simctl` unavailable, Xcode absent, no `adb` or standard Android SDK directory. Before full phase closure, run on iOS and Android and verify safe areas, keyboard/search, modal/Android back, vertical/horizontal scrolling, text scaling, screen-reader feedback, persistence and cart/favorite interactions.
- Phase 4 has not started. Real inventory/hours/media, backend integration and dynamic product hosting remain later scope.

---

Date: 2026-09-15. Environment: macOS, Node 22.17.0, npm 10.9.2, Expo SDK 57.

## Automated checks

- TypeScript: passes with strict mode, including test files.
- ESLint: passes, including the UI-to-mock import boundary.
- Prettier: all source and documentation formatted; check command available.
- Jest: 31 behavior tests, run under both iOS and Android presets (62 executions across 14 passing suites). No snapshots.
- Expo Doctor: 21/21 checks pass.
- Web: static export succeeds into `dist/`.
- Native JavaScript: Expo exports iOS and Android Hermes bundles successfully into `.expo/native-export/`. These are JavaScript bundles, not installable IPA/APK/AAB binaries.

## Browser verification

Tested the exported production web artifact through a local HTTP server at `http://localhost:4173`:

- All five actual tabs navigate: Home, Catalog, Stores, Cart and Profile (Ukrainian labels).
- Catalog displays 10 mock products; Stores displays 3 mock stores.
- Direct route opening and reload preserve the expected screen.
- 390 × 844 viewport: app width is 390px and tab labels remain visible.
- 1280 × 800 viewport: app width is 430px, centered at x=425px.
- Tab hit targets are 55px high with the web bottom inset of zero.
- No console warnings/errors or hydration errors were observed during these flows.

## Native verification gap

There is no Xcode Simulator tool (`xcrun simctl` fails), no Xcode installation, and no Android SDK/ADB/emulator available in this environment. Native platform Jest tests and bundle exports pass, but app launch, hardware back behavior, device keyboard behavior and physical safe-area rendering have not been verified on actual iOS/Android runtimes.

The mandatory definition of done is therefore **not fully satisfied for native runtime verification**. Before closing this phase, run on both platforms and verify launch, all five tabs, safe areas, text scaling, touch targets and keyboard-aware Screen behavior when a form is introduced. Do not report this project as ready for store submission.

## Dependency audit

The installed Expo dependency tree reports 14 moderate findings (`npm audit --omit=dev`), propagated from two transitive dependencies:

- `uuid` through the Xcode project tooling: missing buffer bounds checks in specific UUID APIs.
- `decode-uri-component` through `query-string` / Expo Router: malformed percent-encoded input can cause excessive decoding work.

The suggested automatic fixes downgrade core Expo packages across SDK generations. No forced downgrade or unverified dependency override was applied. Recheck upstream compatible fixes before public deployment; this remains a tracked dependency issue.

## Delivery boundary

No backend, real authentication, payment, maps, push, public deployment or store submission is implemented. The local preview is temporary, and a publicly shareable owner-demo URL requires the later hosting step. The full application goal remains active; only this frontend foundation phase has been implemented.

## Catalog hydration follow-up

The catalog now defers product queries until persisted preferences finish restoring. A regression test first reproduced the unwanted unfiltered request, then passed after the fix under both iOS and Android Jest presets. Tests cover restoring a selected store (one initial filtered request) and continuing without a saved store.

`npm run check` and `npm run export:web` pass after the fix. The exported catalog was opened and reloaded in the browser with no console warnings/errors. The native runtime limitation above still applies; no simulator/device verification is claimed.

## Phase 2 verification — 2026-09-16

Implementation and web review are finished. **Full phase closure remains pending native runtime verification.** The missing native gate is not replaced by Jest or bundle exports.

### Requirement evidence

| Requirement                   | Implementation / evidence                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve architecture         | Thin routes, RepositoryProvider, query hooks and Zustand stores retained; existing repository, hydration, query and state suites pass. UI mock imports remain prohibited by ESLint.                              |
| Centralized visual system     | `src/theme/tokens.ts`: supplied palette, semantic colors, spacing, radii, typography, icons, heights, layers and motion; `beerStyles.ts`: style mapping and safe fallback including prototype-property names.    |
| Fonts and icons               | Local Lora 600 and Manrope 400/500/600/700 loaded in FontProvider with Feather. Lora replaces Fraunces because Ukrainian requires Cyrillic support.                                                              |
| Base components               | Screen, Container, AppText, Button (five variants), IconButton, Card, Divider, Badge, Chip/FilterChip/ChoiceChip, LoadingIndicator.                                                                              |
| Forms and commerce primitives | TextInput/SearchInput, SectionHeader, QuantityControl and Price; behavioral tests cover input, search/clear, errors, disabled controls, quantity bounds and discount semantics.                                  |
| Product presentation          | Standard/compact ProductCard, ProductImage source/loading/failure states, beer-style tints, favorites/cart callbacks and availability; repository-sourced products in showcase.                                  |
| Taste and accents             | BitternessIndicator with three named levels, four-axis FlavorProfile with bounded/unknown values, original hop/wheat SVG decorations.                                                                            |
| Feedback                      | Four EmptyState examples, skeleton primitives/product/list/section variants, retryable ErrorState, controlled OfflineBanner, ToastProvider and Modal with close/footer actions.                                  |
| Navigation and layout         | Five icon/label tabs with reactive cart badge; runtime safe-area insets; centered 430px web shell; narrow product examples wrap to one column; 11px navigation token keeps all five labels visible at 320px.     |
| Internal showcase             | `/design-system`, enabled in development or explicit review export; absent from tabs. Default production route redirects to not-found.                                                                           |
| Motion and accessibility      | 48px minimum component touch targets, named controls and state semantics, focus rings, static skeletons, no modal animation. Screen-reader toasts remain until dismissed; async lookup and timer cleanup tested. |
| Scope                         | Complete Home/Catalog/Product/Maps/Checkout/Auth/Loyalty/Orders screens, APIs and payments remain deferred as requested.                                                                                         |

### Fixes made during final review

- Replaced an invalid `expo-font.isLoaded.mockReturnValue` setup with an explicit module mock so all suites execute.
- Tested the actual toast timer cancellation rather than counting unrelated framework timers; added pending-lookup cleanup coverage.
- Clear Metro caches when switching review and default builds. A cached production client previously disagreed with review HTML and redirected the showcase.
- Stabilized UAH formatting as `₴`: differing Node/browser ICU currency symbols caused React hydration errors. Added a regression test simulating the alternate symbol.
- Wrapped cramped product examples on narrow screens and adjusted navigation typography to prevent label truncation.
- Updated Expo within SDK 57 to `~57.0.23`, as requested by Expo Doctor's version check.

### Automated verification

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`: pass. Jest runs 76 scenarios under each platform preset: **152 passing executions across 20 suites**, no snapshots.
- `npm run export:web`: passes, default production export.
- `npm run export:design-system`: passes, explicit internal review export.
- `npx expo-doctor`: 21/21 checks pass after the SDK patch update.
- Both exports are checked separately because their route gate differs.

### Browser review

Reviewed static exports on localhost using the in-app browser:

- 320px: single-column product examples, usable compact card, inputs, horizontal chips and readable five-tab labels; no document horizontal overflow.
- 390px: flavor profile, price/quantity, empty states and form layout reviewed.
- 1280px: app frame measured 430px wide at x=425; two-column product examples remain readable.
- Favorite toggle, add-to-cart, persisted cart count, search submit/clear, quantity increment, modal close via Escape and footer/close controls exercised; toast feedback displayed.
- All five tabs navigate; badge reflects showcase cart actions.
- Fresh final review tab logs show no warning/error or hydration messages. Default production `/design-system` redirects to not-found and the main app remains usable.
- Checked important color pairs: primary/background 12.65:1, subtle/surface 5.90:1, error/background 5.84:1, primary text/IPA tint 13.25:1. Decorative muted colors are not used as important body text.

### Remaining native gate

Rechecked on 2026-09-16: `xcrun simctl list devices` fails because simctl is unavailable; Xcode is absent from Applications. `adb` is not in PATH; the usual Android SDK emulator/platform-tools paths are absent. No native app launch is claimed.

On an environment with Xcode and Android SDK (or compatible physical devices), verify on **both** platforms:

1. Launch with fonts/icons loaded and open `/design-system` in development.
2. Navigate all tabs and check home-indicator/navigation-area insets, readable labels and cart badge.
3. Exercise product favorite/cart callbacks, quantity bounds, search and disabled/error inputs with the software keyboard.
4. Open/close the modal (including Android back), inspect long content and keyboard avoidance.
5. Check text scaling, screen-reader labels/feedback, toast dismissal and reduced-motion behavior.

After those checks, record device/OS and results here before marking the phase fully verified. Next screen work still needs a new brief.
