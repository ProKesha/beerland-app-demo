# Release prerequisites and device test plan

Phase 10 provides a polished frontend demo, integration boundaries and local export checks. It does **not** establish production service, store-submission or legal readiness. No EAS cloud build, deployment or submission was performed.

## Build configuration

| Item                  | Current state                                                                                                              | Before release                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Name / slug / version | Beerland / beerland / 1.0.0                                                                                                | Owner approval and version policy                                                                 |
| Orientation / scheme  | Portrait / `beerland`; iPad support disabled                                                                               | Verify supported devices and real deep-link behavior                                              |
| Build numbers         | iOS `1`, Android `1`                                                                                                       | Increment for actual distributed builds                                                           |
| Bundle/package IDs    | Unset; optional private build settings `BEERLAND_IOS_BUNDLE_ID`, `BEERLAND_ANDROID_PACKAGE` validate reverse-domain syntax | Approve stable identifiers; do not invent them                                                    |
| EAS development       | Internal development-client profile; public demo flags default off                                                         | Install compatible `expo-dev-client` when authorized; approve IDs, native tooling and credentials |
| EAS preview           | Internal optimized demo, mock data, demo auth off                                                                          | Native build/signing and device testing; not production identity                                  |
| EAS production        | Explicit production environment; blocked by `app.config.js` and unavailable client repositories                            | Real adapters/auth, approved IDs and every applicable release gate                                |
| JavaScript exports    | Web, iOS and Android passed                                                                                                | Installable native build and runtime/manifest verification are separate                           |

Never remove the production guard just to generate a build with mock services. An API URL does not implement them. No Apple Developer, Google Play or monitoring credentials are needed for the local frontend demo.

## Branding and business information needed from Beerland

- Official logo/vector source, approved color/font usage, app icon, splash and favicon artwork.
- Final iOS icon and Android adaptive foreground/background/monochrome layers with proper transparency, masks and safe zones. Existing bottle artwork is temporary; the current opaque Android layers are not final adaptive-icon assets.
- Real store list, stable IDs, approved addresses/coordinates, contacts, opening intervals/timezones, temporary closures, supported fulfillment and official support contacts.
- Catalog, variants/servings, metrics, descriptions, rights-cleared product photos, prices, promotions and their validity rules.
- Authoritative stock, assortment and tap-list sources with refresh rules; POS/CRM ownership and synchronization.
- Loyalty earning/redemption/tier/expiry rules and card security.
- Delivery areas, fees, minimums, schedule, promises, provider and handling of unsupported addresses.
- Order lifecycle, payment provider, cancellations/refunds and failure reconciliation.
- Approved privacy/terms/support content, data retention/deletion policy and alcohol-related business/legal decisions. An 18+ self-declaration and demo OTP do not establish legal compliance.

Missing information must remain marked demo/absent; it must not be filled with guessed public business details.

## Links and Web hosting

Internal `/product/[id]`, `/store/[id]` and `/order/[id]` routes validate IDs and recover from missing entities. Current ID syntax is 1–80 letters/digits/hyphens; agree on compatibility before adopting backend IDs. Private order authorization belongs on the server as well as in repository/UI guards. Auth return destinations use a fixed internal allowlist.

For a future Web demo, choose an approved HTTPS static host with generated-page routing, safe dynamic fallback rewrites, 404 handling and cache/security policy. The local preview implements the required fallback pattern; verify refresh on the actual host before sharing its URL. There has been no external deployment.

Production Web/API/image/map domains are not approved yet. iOS Universal Links need an approved domain, associated-domains entitlement and hosted Apple association file for the real app identity. Android App Links need an approved HTTPS host, verified intent filters and an association file with the final package/signing fingerprints. Test cold/warm launches, auth ownership and missing entities. No guessed domain, association file or application identity was added.

## Permissions and notifications

The app has no camera, microphone, contacts, active geolocation or notification-permission flow. Android declares no additional requested permissions and blocks those unused sensitive permissions plus legacy external storage. The map displays store coordinates; it does not need the user's position.

Export checks do not inspect a generated native manifest/Info.plist. Verify both after a real native build, including defaults contributed by dependencies. Do not promise that Expo Go's host permissions match a standalone app.

Notification preferences are local toggles only. Future push work requires explicit authorization for that phase: permission/consent UX, supported native configuration, device-token registration/rotation/revocation, an authenticated backend, per-account preferences, opt-out, delivery policy and safe order deep links. Do not register tokens or request permissions in this phase.

## Observability and production security

No monitoring provider was connected. Future integration points are the root error boundary, startup recovery, QueryClient read/mutation errors, repository adapters and the map's error callback. Add an injected reporting boundary with release/environment tags, redaction and consent/retention policy before connecting any service. Never report OTPs, tokens, phone/address fields or full private orders. Development should retain useful diagnostics.

Real auth, account authorization, order pricing/inventory, rate limits, idempotency and payment status require backend enforcement. Native credentials require secure storage; Web requires protected server-managed sessions. Demo AsyncStorage records and recovery copies can contain personal data and have no production encryption guarantee. Multi-key workspace writes are not crash-atomic. See [persistence](persistence.md) and [integration contracts](integration-readiness.md).

The map loads pinned MapLibre scripts/styles and OpenFreeMap tiles over the network. Review hosting/CSP/provider policy and offline behavior before production. Nearby pins can overlap at a country-wide zoom; zoom and list access remain available. Reassess density against the real store list rather than adding speculative clustering.

## Exact remaining physical iPhone checks

**NOT YET VERIFIED for Phase 10.** Record device, iOS version, client/build, app revision and result for each step. Use a compatible SDK 57 client for frontend review; verify a standalone signed preview separately when available.

1. Fresh install/cold start: splash/font loading, slow storage, recovery retry and no white/protected-content flash.
2. First launch: underage restriction, correction, adult confirmation, all onboarding pages, skip, guest entry and restart persistence.
3. Home: selected store, pickup/delivery availability, search/category/tap shortcuts and scroll beneath tabs.
4. Catalog/search: fast typing, clear/history, filters, sort, grid/list, empty/error retry and long-list scrolling.
5. Product: variant changes, unavailable offers, favorite, rapid quantity taps, image loading/failure and sticky CTA.
6. Cart: totals/units, quantity/removal, reload persistence, unavailable/over-limit lines and checkout readiness.
7. Store transfer: guest and account carts, variant identity, fulfillment change, unavailable lines, cancellation and failed validation preserving the original cart.
8. Checkout pickup and delivery: address/default/edit/delete, dummy contact validation, payment disclaimer, age checkbox, submitting lock, duplicate taps, retry/idempotency, success and cleared cart.
9. Stores: map/list persistence, marker highlight/selection, zoom, details/hours, closed store, network failure/list fallback, navigate away/back and WebView recreation/termination.
10. Profile area: favorites, order detail/repeat, addresses, personal data, demo Club QR, notification preferences and support.
11. Internal auth: normalized phone, request failure, loading lock, invalid/expired OTP, resend timer/limit, separated-code paste and challenge cancellation/recovery.
12. Profile completion/skip, guest/account merge decisions, repeated login without doubled quantity and logout restoring guest state.
13. Account A/B: cart, addresses, unsaved forms, profile, Club and order isolation; A's private order link denied to guest/B.
14. Valid/expired/failed session restoration; force-close and restart during OTP, checkout and guest/account handoff; correct workspace afterward.
15. Keyboard on Search, Address, Personal Data, Checkout, Phone, OTP and completion: focus, scroll, dismiss and reachable CTA on a small iPhone.
16. Notch/home-indicator safe areas: auth/onboarding, modals, sticky product/cart/checkout actions and tabs; no double inset or toast blocking an action.
17. Repeated product/store/order pushes, back gesture, modal dismissal and cold/warm direct links; missing/invalid entities recover sensibly.
18. VoiceOver: reading order, names/state, icon buttons, tabs, quantity, selected store, modal focus/return, OTP errors, checkout warnings and toast announcements/dismissal.
19. Larger accessibility text sizes: long titles, validation, warnings, wrapped buttons and critical CTA reachability.
20. Reduce Motion toggle at launch and while running: stack transitions change without losing useful feedback.
21. Standalone preview: real icon/splash behavior and final permission declarations; no unintended permission prompt or development control.

Previously reported iPhone checks for Phase 9A, Phase 8.5 and the map are historical evidence, not a new pass for these Phase 10 changes. Phase 9B physical verification also remains pending.

## Exact remaining Android checks

**NOT YET VERIFIED.** Record device, Android version, client/build and revision. Repeat these on a small device and with larger system font/display settings.

1. Fresh install/cold start, splash/fonts, slow storage and startup recovery without protected-content flash.
2. Underage/adult entry, onboarding/skip, guest entry and restart persistence.
3. Home/store/fulfillment and discovery shortcuts with scrollable content and fixed tabs.
4. Catalog/search fast typing, history/clear, filters/sort/grid-list, empty/error retry and sustained scrolling.
5. Product variants, offers, favorite, rapid quantity taps, image failure and sticky action.
6. Cart totals/units, quantity/removal, rehydration, unavailable/over-limit lines and readiness.
7. Cart transfer/merge across stores, fulfillment reconciliation, cancellation and failed validation without data loss.
8. Pickup/delivery Checkout addresses/contact/payment disclaimer/age, duplicate-submit lock, retry/idempotency, success and clear.
9. Map/list/markers/zoom/detail, closed store, offline fallback, tab switching and WebView process loss/recovery.
10. Profile/favorites/orders/detail/repeat/addresses/personal/Club/preferences/support.
11. Internal phone auth request/loading/errors, invalid/expired OTP, timers/resend/limits, OTP paste and cancellation/recovery.
12. Completion/skip, guest conflict choice, repeated login, logout and guest restoration.
13. A/B account and unsaved form/order isolation, including denied private deep links.
14. Valid/expired/failed session restore and force-stop/restart during OTP, handoff and order creation.
15. Keyboard focus/dismiss/scroll/CTA on every form, including clipboard OTP and numeric/phone keyboard behavior.
16. Status/navigation/gesture-bar insets, sticky actions, modals, tabs and toast placement; gesture and three-button navigation where supported.
17. System Back from tabs, product/store/order, checkout, OTP, onboarding, age restriction and open modal; first dismiss keyboard/modal and preserve guards/workspace.
18. Repeated pushes and cold/warm custom-scheme links with valid/missing IDs and unauthenticated private links.
19. TalkBack reading order, labels/state, focus return, errors, quantity/store selection and toast interaction.
20. Large font/display scaling and long validation/warning/title text without clipped actions.
21. Reduced animation preference at launch and during use.
22. Standalone preview adaptive icon/splash, generated permissions and absence of debug UI/permission prompts.

## Store submission gates

Technical: production services/auth/order/payment, secure credentials, approved IDs/domains, native signed builds, manifest review, full device regression, performance/accessibility evidence, deep links and monitoring policy.

Business/legal: official developer accounts and signing ownership, final branding/data/support URL, privacy/data-disclosure documents, alcohol-sale/age/fulfillment decisions, account-deletion and retention policies, listing copy/screenshots and required platform declarations. These require approved business inputs and appropriate review; this frontend does not certify compliance.
