# Phase 9B — phone authentication, OTP and demo session

## Scope and security boundary

Authentication is an explicitly enabled internal demo provider. Use `EXPO_PUBLIC_DEMO_AUTH=1` in an Expo development run. The provider is disabled when `__DEV__` is false, including store-distribution builds. It simulates OTP `123456` and sends no SMS. It cannot prove phone ownership or adulthood. When disabled, the app keeps guest browsing and refuses phone login.

Routes are `/auth/phone`, `/auth/otp`, `/auth/complete-profile` and `/auth/merge`. The auth layout requires Phase 9A's adult, onboarding and guest-entry state before rendering any auth screen. Return destinations are an explicit allowlist of internal account and checkout routes.

`AuthRepository` is injected with the existing repositories. The mock adapter validates Ukrainian E.164 phones, challenge IDs, six-digit codes, five attempts, absolute expiry, 60-second resend delay, and at most three resends. It stores challenge metadata without the OTP value. The demo session stores only phone and expiration, and corrupt/expired records fail closed. Demo profile completion is optional; saved profiles are keyed by verified demo phone. Development-only controls simulate request error, code expiry, resend availability and session expiry.

Account workspaces separate cart, favorites, addresses, selected store and fulfillment method from the guest snapshot. A saved `lastGuest` snapshot makes repeated login idempotent. Favorites and compatible addresses merge; cart lines retain product/variant/store/quantity. Mismatched stores or current offer/quantity issues require the user's choice. Transfer uses the existing Phase 8.5 cart validation, preserves unavailable lines, and leaves the guest snapshot untouched. Guest-created local orders are assigned to the first demo account on login and filtered by ownership; they are **not** synchronized to a backend. Logout restores the guest workspace and does not reset first-launch state or notification preferences.

Production integration still requires a real authentication backend, SMS provider, server-side OTP and rate limiting, account and guest-data reconciliation, backend authorization for private resources, token refresh and revocation, secure native token storage, and a backend-managed Web session. The client-side guard is for navigation only.

## Additional verification results — 2026-09-28

The automated and browser verification requested for Phase 9B is complete. Native runtime verification remains outstanding. No Phase 10 work was started, no existing tests were weakened, and no full E2E framework was introduced.

### Confirmed bugs fixed

1. Address merging could retain a selected ID that disappeared after deduplication, produce colliding IDs for different addresses, or keep multiple default addresses. The merge now remaps selection, preserves distinct records, and retains one explicit default.
2. A repeated login could resurrect account favorites or addresses removed since the previous merge and overwrite an account's store or fulfillment preference with unchanged guest settings. Only the guest delta is applied on subsequent merges.
3. Local order ownership could be lost during concurrent writes, assigned to the account active after an asynchronous operation instead of its initiating account, or written too late to prevent a private receipt becoming visible to guests. Ownership is serialized and reserved durably before receipt creation. Corrupt ownership data fails closed, cross-account checkout-key replay is rejected, and stale reads cannot publish private orders after an account change.
4. An in-flight profile update could restore the previous account after logout. Updates now require the initiating account to remain active.
5. Concurrent correct OTP submissions could consume the same one-time challenge twice. The demo adapter serializes challenge and session operations.
6. Interrupted sign-in or failed restoration could leave an account workspace accessible under guest status. Incomplete handoffs now block protected layouts until recovery; startup completes order assignment and restores the guest workspace when authentication or the age/onboarding gate is unavailable. This also covers an unknown or underage first-launch state after an account restart.
7. Auth layout redirects could unmount the navigator, skip optional profile completion, loop under Expo Router, or discard the requested return route. Internal redirects now preserve the navigator and the validated return destination. Changing the phone preserves that destination; opening OTP without a challenge returns to phone entry.
8. The checkout age checkbox changed visually on Web without exposing its checked state through ARIA. Its checked state now agrees with both the native accessibility state and the browser checkbox state.

Regression tests accompany these fixes, including repository races and persistence failures, integration tests using injected repositories and isolated QueryClients, and tests with the real Expo Router layouts.

### Authentication scenario matrix

| Scenario                                                             | Automated tests                                                                               | Browser automation                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest → phone → wrong OTP → correct OTP → optional profile → account | Passed                                                                                        | Passed; validation and saved name/email checked                                                                                                    |
| Incorrect, exhausted, expired and reused OTP                         | Passed; five-attempt limit, expiry and consumed challenge                                     | Wrong attempts exhausted the challenge; expiry, resend and subsequent successful verification checked                                              |
| Resend countdown, cooldown, resend cap and duplicate requests        | Passed, including concurrent verification/request behavior                                    | Countdown observed, resend disabled during cooldown, challenge survived refresh, resend succeeded                                                  |
| Guest cart, variants, favorites, addresses and local orders          | Passed                                                                                        | Preserved across sign-in, refresh and logout; an unavailable cart variant was retained                                                             |
| Guest/account merging and store conflicts                            | Passed, including repeated-login deltas and address selection                                 | Both separate and transfer choices; pending merge survived refresh; cancellation returned to guest                                                 |
| Session restoration after restart                                    | Passed with reconstructed repositories and hydration                                          | Page reload restored the account, profile, workspace and claimed receipt                                                                           |
| Logout and second-account isolation                                  | Passed, including stale reads and profile writes                                              | Original guest workspace returned; account B could not see A's private address/profile/receipt, including a direct receipt URL                     |
| Expired/disabled session and failed persistence recovery             | Passed                                                                                        | Development session expiry returned to guest and remained guest after refresh; disk-write failures were tested in Jest                             |
| Phase 9A age gate and auth route protection                          | Passed for unknown/underage states and actual layouts                                         | Auth deep links blocked before adult entry; underage state persisted after reload; missing OTP redirected; first-launch reset recovered guest data |
| Demo disabled in production                                          | Passed for the config matrix and a disabled provider with existing challenge/session metadata | Production export built with the flag set still refused phone login and exposed no demo controls or OTP hint                                       |

Guest-created local receipts are claimed by the first signed-in demo account. They remain with that account and are intentionally hidden from guests and other accounts after logout. Fixture history shown to guests is separate from these newly created receipts.

### Test and export results

| Check                                                                                                                  | Result                                                        |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm test -- --silent --json --outputFile=.expo/phase9b-tests.json`                                                    | 74 suites, 884 tests passed; zero failures and zero snapshots |
| Authentication subset                                                                                                  | 14 suites, 134 tests passed                                   |
| `npm run typecheck`                                                                                                    | Passed                                                        |
| `npm run lint`                                                                                                         | Passed                                                        |
| `npm run format:check`                                                                                                 | Passed                                                        |
| `git diff --check`                                                                                                     | Passed                                                        |
| `EXPO_PUBLIC_DEMO_AUTH=1 npm run export:web -- --max-workers 2`                                                        | Passed; 140 static routes                                     |
| `EXPO_PUBLIC_DEMO_AUTH=1 npx expo export --platform ios --output-dir .expo/phase9b-ios-export --max-workers 2`         | Passed; Hermes JavaScript export and 30 assets                |
| `EXPO_PUBLIC_DEMO_AUTH=1 npx expo export --platform android --output-dir .expo/phase9b-android-export --max-workers 2` | Passed; Hermes JavaScript export and 34 assets                |

Jest runs every test file under both iOS and Android presets: 37 files and 442 distinct test cases are counted twice in the reported totals. The authentication subset contains 7 files and 67 distinct cases. This work added 30 distinct regression cases, increasing the baseline from 824 to 884 preset executions. Jest presets exercise JavaScript and mocked native modules; they do not launch either operating system.

Expo SDK 57's exact versioned documentation was reviewed. The exports were deliberately produced with `EXPO_PUBLIC_DEMO_AUTH=1` to verify that production `__DEV__ === false` still disables the provider. These are JavaScript exports, not native application builds, signing, installation or launch.

### Browser and security evidence

Browser automation used the Codex in-app browser against the local Expo development server and the final static production Web export. It performed actual UI navigation, form submissions, refreshes, logout, two-account isolation and both cart conflict decisions. No real SMS, payment or order delivery occurred.

Phone, OTP, optional profile, account Profile, merge conflict and age-gate screens were checked at 320×568, 390×844, 430×932 and 1280×800. All 24 screen/viewport checks had no horizontal document overflow; screenshots confirmed readable controls and scrollable content. These are browser viewport checks, not an iPhone viewport or native keyboard simulation.

Generated evidence is stored in ignored local output directories:

- `.expo/phase9b-tests.json`: complete Jest results.
- `.expo/phase9b-browser/responsive-results.json`: responsive measurements.
- `.expo/phase9b-browser/*.png`: screenshots for each screen/width plus `production-auth-disabled-390.png`.
- `dist`, `.expo/phase9b-ios-export`, `.expo/phase9b-android-export`: final exports.

The disabled provider rejects request/verify/profile operations even when given previously valid demo challenge/session metadata. Challenge persistence has no OTP field. No OTP or session values were logged by the auth implementation, and the production browser run reported no console warnings or errors. Development logs contained a React Native Web `pointerEvents` deprecation warning, without authentication values.

The demo phone/expiry and local profile/workspace metadata are unencrypted local demo data. They must not be treated as real credentials or a secure production session. There are no production access/refresh tokens in this implementation; secure native token storage and backend-managed Web sessions remain part of the future production integration described above. Client-side ownership filtering is not backend authorization.

### Remaining limitations

- No physical iPhone, Expo Go session, iOS simulator or Android runtime was available. `simctl` is unavailable because only Xcode Command Line Tools are installed; `adb` is also unavailable. Native launch, keyboard, safe areas, platform accessibility, lifecycle and native storage behavior are unverified.
- Browser page refresh verifies Web restoration; it cannot prove native force-quit or background/resume behavior. Native JavaScript exports do not close this gap.
- Real SMS delivery, backend OTP/rate limiting, real account synchronization, server authorization and token lifecycle are outside the implemented demo provider and were not tested.
- An optional dependency-vulnerability audit did not complete: the sandbox request could not resolve the npm registry, and automatic approval review rejected the escalated `npm audit` because it would transmit dependency names/versions to an external registry without explicit consent. All required local checks completed independently.

## Exact physical iPhone verification still required

Use an internal development run with `EXPO_PUBLIC_DEMO_AUTH=1`; retain existing app storage. Record the device, iOS version and runtime used. The following remains unverified on a physical iPhone:

1. Complete the adult onboarding and guest entry, then force-close and reopen. Test an underage selection, persistence after restart, and native auth deep links while age status is unknown or underage. Confirm the iOS back gesture cannot bypass either guard.
2. Seed a guest cart with two variants, a favorite, selected store, address and local receipt. Open **Профіль → Увійти або зареєструватися**. Verify native phone/numeric keyboards, number normalization, six-digit paste and automatic OTP submission, focus, keyboard dismissal and scrolling to primary actions on a small iPhone. Check notch/home-indicator safe areas, landscape and larger text.
3. Test five wrong OTP attempts, exhausted/expired codes, successful resend and changing the phone. Rapidly tap request, verify and resend. Background or lock the phone while the countdown runs, then resume after cooldown and expiry; confirm absolute timing and no duplicate operation. Use the development controls for request failure and code expiry.
4. Complete name/email validation and test **Заповнити пізніше**. Confirm guest cart variants, favorites, selected address/store and the local receipt survive sign-in. Repeat login after account-only changes and verify they are preserved.
5. Create a different account store/cart, return to the guest workspace and change its cart. Test **Зберегти кошики окремо** and **Перенести гостьові товари**, cancellation, native back navigation, unavailable offers and quantity warnings. Force-close on the pending merge screen and resume it.
6. Force-close after successful login, reopen and verify session, cart, favorites, addresses and claimed receipts. Also background/resume during OTP verification and immediately after login; confirm there is no guest view of account data during restoration.
7. Cancel logout once, then confirm it. Verify the original guest workspace returns and private profile/address/receipt data disappear. Force-close and reopen as guest; log into another number and open the first account's receipt deep link. Use **Тест: завершити демосесію**, reopen and verify guest recovery. Repeat after resetting first-launch state.
8. Use VoiceOver for phone/OTP inputs, error messages, countdown/resend state, profile actions, merge choices, logout confirmation and the checkout age checkbox. Verify announced checked/disabled states and reachable actions with the keyboard open.
9. In a production iOS application build, including one with the demo flag accidentally set, verify that phone login and demo controls are disabled and that no OTP/session secrets are emitted to native logs. This requires a native build and device launch; the completed Hermes export is insufficient.

These checks have not been performed in Expo Go or any native runtime. Phase 9B has completed automated/browser verification, with an explicit native-device verification gap.
