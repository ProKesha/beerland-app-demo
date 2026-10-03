# Phase 8 verification

## Scope and implementation

Phase 8 implements Profile, Beerland Club with an enlarged QR, Favorites, Order History and Detail, shared repeat-order behavior, saved addresses, personal data, support/FAQ, settings and local notification preferences. Routes stay thin. No Phase 9 functionality is included.

User and loyalty data are injected repositories with account query hooks. Order history merges three demo receipts with persisted Checkout orders without replacing them. Favorites and addresses reuse the existing stores. Order status labels and progress are centralized. Reorder resolves current products, variants, store availability, current prices and limits, preserves separate variants, reports partial results and reuses store/cart confirmation. Home invokes the same hook.

The QR encodes only a demo membership identifier. Demo tiers and points are configuration, not approved commercial policy. No real authentication, push permissions, redemption, CRM integration or unsupplied legal policy is implemented. Support/legal actions are disabled until configuration is supplied. Personal fields reuse Checkout validation; malformed local profile data can be replaced by valid input, while storage failures remain retryable.

## Automated checks — 2026-09-22

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 702 passing executions across 52 suites (351 cases on both iOS and Android presets), no snapshots. All 696 preceding executions are retained; this finalization adds six executions for profile recovery/read retry.
- `npm run format:check`: passed.
- `npm run export:web -- --max-workers 2`: passed; output in `dist/`. Worker limiting only controls build concurrency.
- iOS and Android Hermes exports: passed (`npx expo export --platform ios --platform android --max-workers 2 --output-dir .expo/phase8-native-export`). These are JavaScript bundles, not installable native builds.
- `git diff --check`: passed.

The successful Jest run still emits React `act(...)` warnings from asynchronous updates in some existing component tests. Assertions all pass; warnings have not been suppressed.

Initial concurrent Jest/Metro runs suffered timeouts under host load and were stopped. The sequential run exposed a pre-existing test race: Product Detail tests waited for the product heading but interacted before the independent store query resolved. The test helper now waits for the selected-store control when hydrated. All existing assertions and test cases are retained; no application behavior was relaxed.

Phase 8 tests cover repository identity and persistence, live counts/navigation, loyalty loading/activity/progress, QR decoding, shared favorites and unavailable products, merged order history, receipt totals/fulfillment, current-offer reorder and store conflicts, repeated presses, address editing/default/deletion/seeding, personal validation, local notification preferences, FAQ, settings, retry and architecture boundaries. Finalization adds malformed-profile recovery and failed-read retry coverage.

## Browser review

Fresh exported-build review on 2026-09-22 used a local static server with extensionless HTML resolution. All 11 routes (Profile, Loyalty, Favorites, Orders, completed and active Order Detail, Addresses, Personal Data, Support, Settings and Notifications) rendered their expected headings at 320, 390, 430 and 1280 CSS pixels. In all 44 checks, document scroll width equaled viewport width.

Visual screenshots covered the narrow Profile, active receipt, empty and populated Favorites, saved Addresses, Personal Data, FAQ and Settings. Enlarged QR was inspected at all four widths, retaining its quiet zone and readable membership text. Profile retained the centered desktop shell. Product favorite toggling appeared in Favorites and was restored to the original empty state after review. Persisted prior Checkout receipt BL-1042 appeared alongside three demo receipts. No warnings/errors were captured in the final browser review tab.

The preceding implementation task also recorded the broader interaction review, including reorder partial results and forms. Component tests continue to verify these behaviors with injected repositories. Static deployment must resolve extensionless HTML and provide the existing dynamic-route fallback for locally created order IDs; static generation cannot pre-render receipts created after build time.

## Native verification gap

Rechecked on 2026-09-22: `xcrun simctl list devices` fails because simctl is unavailable, Xcode is absent from /Applications, and adb is absent from PATH. There is no available iOS or Android runtime on this host. Jest platform presets and Hermes exports are not device verification.

Full native definition of done remains open. On both platforms verify launch and account navigation; safe areas and large text; QR scanning and modal dismissal; long receipt scrolling; reorder/partial result/store confirmation; favorites/cart consistency; address forms, keyboard and confirmed deletion; personal-data persistence and validation; notification preference persistence. Include Android hardware back and iOS modal gestures.

## Before Phase 9

Complete the native runtime checklist on an equipped host/device and record evidence. Production support/legal contacts, authentication and authoritative loyalty policies remain future integration inputs, not invented configuration. No Phase 9 work has started.
