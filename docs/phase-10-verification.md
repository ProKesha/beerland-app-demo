# Phase 10 — product polish and release preparation

Date: 2026-09-28. Scope: audit/polish of Phases 1–9B, with existing routes, features, repositories, Query and Zustand architecture preserved. No backend, SMS/payment/POS integration, external deployment, store submission or cloud build was started.

## Verification labels

| Label                      | Meaning / current status                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **IMPLEMENTED**            | Phase 10 fixes, demo scripts/config and documentation are present.                                                                                     |
| **AUTOMATICALLY VERIFIED** | TypeScript, lint, Jest, formatting and exports/checks listed below; mock tests do not prove native runtime behavior.                                   |
| **BROWSER VERIFIED**       | Actual local development and optimized demo flows, DOM layout measurements and visual checks at the four required sizes.                               |
| **NATIVE DEVICE VERIFIED** | No new Phase 10 physical-device result. Earlier user-reported iPhone passes for 9A/8.5/map remain historical only.                                     |
| **NOT YET VERIFIED**       | Physical iPhone/Android, VoiceOver/TalkBack, actual system text/keyboard/insets, installable native builds/manifests, production services and hosting. |

Full Xcode/Simulator and Android runtime tooling are unavailable here: `xcrun --find simctl` fails and `adb` is absent. Exports are JavaScript/Hermes bundle checks only. Phase 10 is complete in code; the mobile runtime portion of the engineering definition of done remains open.

## Audit coverage

| Area            | Reviewed and exercised                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discovery       | Home, store picker, tap/editorial sections, Catalog, Search, filter modal, sort, empty results, units/prices and image fallbacks                                                                                   |
| Commerce        | Product/variants, favorite/cart actions, rapid quantities, revalidation, transfer confirmation, pickup/delivery Checkout, payment disclaimer, age confirmation, mock success, order detail and repeat-order review |
| Store discovery | List/map selection, marker state, attribution, detail/hours, timezone handling, closed store, fallback/retry and stable map adapter boundaries                                                                     |
| Account         | Guest/profile A/B, Favorites/empty state, Orders/empty state, private detail, Addresses/form, Personal Data, Club, Notifications, Support and Settings/logout                                                      |
| Entry/auth      | Age/restricted screens, all onboarding pages, guest entry, phone/OTP/invalid code/paste, completion/skip, merge choice, logout, restore and production disabling                                                   |
| Cross-cutting   | Tokens/copy, safe areas, keyboard ownership, loading/error/empty states, navigation/IDs, persistence/owner isolation, environment, logs, dependencies, icons/permissions/EAS and integration seams                 |

Failures that require injected storage/repositories or native preference events were exercised in component/unit tests. Browser testing did not simulate every backend/storage failure or a real mobile keyboard.

## 1. Bugs discovered and 2. Bugs fixed

| Confirmed issue                                                                                       | Fix / protection                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantity taps in the same render interval could reuse a stale value                                   | Pending ref plus controlled-value synchronization counts bursts and respects bounds.                                                                      |
| Initial Checkout quote error was hidden behind the no-data loading branch                             | Error/retry comes first; cart/draft survive retry.                                                                                                        |
| Clearing QueryClient alone did not isolate late account reads or unsaved forms                        | User/Club/order keys contain owner; pre/post-await ownership checks; forms/modals reset on owner changes. Create-order publication also checks owner.     |
| Missing order ledger could reinterpret private receipts as guest data                                 | Fail closed once an account handoff exists; initialize the valid ledger before creating the guest workspace snapshot.                                     |
| Partial persisted-store read failures could let startup proceed                                       | Track hydration errors, stop readiness and rehydrate on retry. Ignore obsolete async session restores.                                                    |
| Invalid/unsupported persisted JSON lacked reliable preservation                                       | Validate before generic hydration, keep safe defaults and retain the raw record in a recovery copy.                                                       |
| Invalid public config could fail at import; an API URL did not make mock repositories production-safe | Typed safe resolver, branded recovery, unavailable production adapters and build-time production guard.                                                   |
| `phase6-review` was reachable and could seed/overwrite local commerce data                            | Central development guard and lazy loading; optimized direct route redirects to not-found.                                                                |
| Native font loading or remote image loading could remain pending indefinitely                         | Eight-second font recovery and twelve-second image fallback; reject unsafe image URLs and reset source state.                                             |
| OTP separator paste/loading/cancellation/recovery had incomplete interactions                         | Normalize longer paste input, lock fields/exits while busy, recover challenge-read/cancel failure and cancel on back.                                     |
| Repeated entity pushes could grow duplicate navigation entries                                        | Singular product/store/order/checkout/profile-leaf stack entries; route IDs validate at the thin route boundary.                                          |
| Newly created local entities could fail direct static refresh                                         | Generic static entity pages plus safe local-preview fallback rewrites; missing entities retain useful navigation.                                         |
| Persistent Web toast could cover/intercept Cart/Checkout actions                                      | Web feedback now expires instead of trusting RN Web's reader-capability stub; keep native reader dismissal, safe placement and pointer-event passthrough. |
| Favorites/orders rendered growing arrays in a ScrollView                                              | Shared single vertical FlatList with stable keys and bounded initial/batch rendering.                                                                     |
| RN Web warned about the fulfillment `pointerEvents` prop                                              | Use the supported style property.                                                                                                                         |

## 3. UX / visual polish

The existing warm palette, typefaces and mobile composition remain. Changes use tokens for map controls/detail radii, wrap modal titles safely, unify keyboard inset ownership, keep scroll dismissal predictable and prevent sticky CTA obstruction. Retry/empty states remain Ukrainian and do not expose exception text. Product fallbacks are deliberate neutral assets; no photography or official logo was invented.

Money/serving/ABV/IBU formatting was reviewed through shared utilities and existing regression tests. Order timestamps and business hours retain explicit timezone handling; OTP uses absolute expiry rather than elapsed-device assumptions. No stylistic copy rewrite was needed.

## 4. Performance

Favorites and history now virtualize. Catalog already pages 36 results with an eight-row render batch; search retains its 250ms debounce, normalized request keys and stable recent queries. Store-detail status is calculated once per render rather than once per weekday. Map selection/status updates reuse the existing map/markers, and listeners/timers dispose on unmount. No blanket memoization, new animation library or measured native frame-rate claim was added.

## 5. Accessibility

Cart totals announce the real formatted line amount. Loading images avoid announcing a duplicate photo. Map markers/zoom controls and notification rows have usable target sizes and checked/selected state. Existing labels/roles for buttons, filters, tabs, variants, quantities, age/auth forms and warnings remain. Native reduced-motion preference controls stack transitions and live changes. Modal title/text layouts avoid unnecessary fixed clipping.

Actual VoiceOver/TalkBack focus, Dynamic Type and native keyboard behavior still require the device plan; component assertions and browser semantics are not equivalent evidence.

## 6. Startup / persistence

The existing hydration lifecycle now waits on failed persisted-store reads and rejects obsolete restore completion. Branded root/startup recovery supports retry, while development keeps Expo diagnostics. Font timeout releases the native splash. Version-1 records remain; recovery preserves malformed/unsupported generic payloads. No blanket user-data deletion or second readiness state machine was introduced. Exact keys, migrations, guest/account ownership and residual crash risks are in [persistence](persistence.md).

## 7. Security / configuration

Development/demo/production are explicit and typed. Production always uses unavailable adapters until integration; malformed configuration fails safely. A build guard was directly checked to reject production. Demo auth remains disabled in every optimized bundle even with a flag enabled. Auth return paths use an internal allowlist; entity routes validate IDs and private orders remain owner-filtered.

A workspace scan of 295 text/source/config files at audit time found no matches for common private-key/AWS/GitHub/Google/OpenAI credential patterns. No tracked `.env` secrets were found; local environment files are ignored. Runtime `src/`/`app/` contains no console logging of OTPs, credentials, profiles or private orders. This is a source audit, not a guarantee against every possible secret or dependency vulnerability. Local demo contact/address records remain plaintext; production enforcement is a backend requirement.

## 8. Development-only isolation

Design-system showcase requires its flag and development mode. Phase-6 review, first-launch reset and auth request/expiry/resend/session simulations use central development guards. Optimized direct `/design-system` and `/phase6-review` links were browser-tested as unavailable. Internal showcase export is intentionally `--dev`, separate from the optimized owner demo.

## 9. Dependencies / dead code

No dependency versions were changed in Phase 10. `npm ls --depth=0` passed; runtime and test dependencies retain their existing separation. The offline Expo compatibility check reported up-to-date packages but warned that offline validation is advisory. No current online vulnerability-audit claim is made.

Unused `PlaceholderScreen` and the uncalled `restoreDemoWorkspace` helper were removed after reference searches. Future API interfaces and map adapters remain. Review pinned map CDN/security policy, upstream SDK compatibility and eventual `expo-dev-client` separately; no broad upgrade was performed.

## 10. Tests added and 11. Final count

Five new source files plus navigation and toast regressions provide 41 distinct new behavior cases, executed on both Jest projects (82 additional checks):

| File / change                       | Coverage                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `release-config.test.tsx`           | Production/development flag combinations, malformed config, guarded routes, unavailable repositories and recovery              |
| `polish-interactions.test.tsx`      | Rapid/bounded quantity, true cart total, initial Checkout retry, image timeout/source/unsafe URL, OTP recovery and busy fields |
| `account-isolation-polish.test.tsx` | Late owner-scoped profile/Club/order responses, history, unsaved Personal/Checkout drafts and missing-ledger privacy           |
| `startup-polish.test.tsx`           | Invalid/unsupported storage preservation, valid version-1 records, partial read retry and obsolete session restore             |
| `motion-font-polish.test.tsx`       | Font timeout/error, reduced-motion subscriptions/cleanup and stale preference resolution                                       |
| `navigation.test.tsx` addition      | Repeated product taps produce one back destination                                                                             |
| `toast.test.tsx` addition           | Web feedback expires despite the RN Web screen-reader capability stub; native explicit reader dismissal remains covered.       |

The existing ProductImage test now distinguishes loading from loaded accessibility instead of weakening its behavior. All earlier cart-transfer/idempotency/auth-replay/age-migration/isolation tests remain passing. No snapshots were added.

Baseline: **884/884 checks, 74/74 suites**. Final: **966/966 checks, 84/84 suites**, zero snapshots, 42 source test files across iOS and Android presets. Local JSON evidence: `.expo/phase10-baseline-tests.json` and `.expo/phase10-final-tests.json`.

## 12–15. Required checks and exports

| Command                                                                   | Result                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run typecheck`                                                       | PASS                                                               |
| `npm run lint`                                                            | PASS                                                               |
| `npm test -- --silent --json --outputFile=.expo/phase10-final-tests.json` | PASS: 966 checks / 84 suites                                       |
| `npm run format:check`                                                    | PASS                                                               |
| `npm run export:web -- --max-workers 2`                                   | PASS: `dist/`, 144 static routes, approximately 2.4MB entry bundle |
| `npm run export:ios -- --max-workers 2`                                   | PASS: `.expo/exports/ios`, approximately 4.2MB Hermes bundle       |
| `npm run export:android -- --max-workers 2`                               | PASS: `.expo/exports/android`, approximately 4.5MB Hermes bundle   |
| `git diff --check`                                                        | PASS                                                               |

Exports used `EXPO_OFFLINE=1 EXPO_PUBLIC_APP_ENV=demo EXPO_PUBLIC_DEMO_AUTH=0 EXPO_PUBLIC_DESIGN_SYSTEM=0`. Metro cache rebuild and terminal color-environment warnings were nonfatal. No installable native binary was built.

## 16. Browser viewport results

| Viewport | Document overflow            | App shell                   | Tabs / forms / modals                                                  |
| -------- | ---------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| 320×568  | None in measured checkpoints | 320px, full viewport height | Scrollable content, reachable actions; critical narrow forms exercised |
| 390×844  | None                         | 390px                       | Correct app layout and fixed tabs                                      |
| 430×932  | None                         | 430px                       | Correct app layout and fixed tabs                                      |
| 1280×800 | None                         | 430px centered at x=425     | Clean surrounding background; tabs remain inside shell                 |

There are 216 DOM measurements covering 54 screen/state checkpoints in `.expo/phase10-browser/measurements.json`. The browser walkthrough covered catalog filter/sort/no-results, product/cart/store transfer, pickup mock checkout, repeat order, profile/preferences/address form/map and development A/B auth/logout/merge/private-order denial.

Final optimized output additionally passed fresh age/restriction/guest entry, delivery Checkout with dummy data, a 110 UAH mock receipt, newly created order direct refresh, disabled auth/dev routes and missing product/store/order recovery. Captured warning/error logs for the final preview were empty. Browser clipboard automation needed explicit field focus after narrow-screen scrolling; it did not indicate a failed app validation or native keyboard pass.

DOM measurements are the layout evidence; earlier rapid-resize screenshots can contain a scaled prior viewport. Final proof images are captured after viewport settling (`.expo/phase10-browser/final-home-*.jpg`, `final-cart-toast-*.jpg` and `final-checkout-320.jpg`). The last rebuilt Web artifact also passed automatic toast dismissal, reachable Checkout and a visible complete summary at 320px. No screenshot is evidence of a physical device.

## 17. Owner demo readiness

Optimized static guest presentation is ready locally: `npm run export:demo`, then `npm run preview:web`. Age protection remains. Internal auth is demonstrated separately on an explicitly enabled development server; the static demo cannot accept mock OTP. The [14-step owner walkthrough](owner-demo.md) covers the complete product. Actual external hosting remains unperformed.

## 18. Integration prerequisites

Real Auth/Product/Store/Order/User/Loyalty/Promotion adapters, server authorization, secure sessions, authoritative stock/pricing/quote/order idempotency and synchronization policy are required. Address CRUD is currently a local store, not an existing `AddressRepository`; its future interface requires design. Exact methods, assumptions, pagination/error behavior and identity requirements are in [integration readiness](integration-readiness.md).

## 19. Real Beerland data required

Official branding/photos, real stores/hours/contacts, catalog/variants/prices/stock/tap lists, promotion and Club rules, delivery/payment/POS/CRM sources, support and privacy/terms information remain missing. No missing information was presented as verified public business data. See [business inputs](release-readiness.md#branding-and-business-information-needed-from-beerland).

## 20. App Store / Google Play prerequisites

Approved IDs/developer accounts/signing, final icon/adaptive/splash assets, production services, privacy/support URLs and disclosures, alcohol-related business/legal decisions, native signed builds/testing and listing assets remain required. EAS profiles are structural preparation only; production is blocked. No absolute store-release readiness or legal compliance is claimed.

## 21. Physical iPhone tests and 22. Android tests

All Phase 10 physical checks are pending. The exact [21-step iPhone plan](release-readiness.md#exact-remaining-physical-iphone-checks) and [22-step Android plan](release-readiness.md#exact-remaining-android-checks) include startup, commerce/transfer, map, auth/OTP paste, owner isolation, force-close/restart, keyboard/insets, accessibility/text/motion and deep navigation; Android also requires system Back. Previously reported native checks do not close these gaps.

## 23. Remaining technical risks

- Local multi-key workspace/order writes are not crash-atomic, encrypted or server-authorized. Interrupted handoffs and storage failure need device testing and future synchronization design.
- Native VoiceOver/TalkBack, large text, keyboard, safe areas, map WebView lifecycle and reduced motion are unverified at runtime in this phase.
- Map/CDN network availability and closely spaced pins at wide zoom require provider/real-dataset review; zoom/list fallback remain usable. No native performance trace was captured.
- Real history/address pagination and multi-device ownership must be specified with the backend. Current catalog pagination remains usable.
- Static hosting must reproduce dynamic rewrites and private-link rules. No approved production domains/Universal Links/App Links exist.
- Temporary Android icon layers, final permissions/manifests, dev-client setup, signing and installable builds remain incomplete.
- No online security audit or production credentials/services were added; the frontend is not a production security boundary.

The required next work is physical verification and approved integration/release decisions, not an automatically started new development phase.
