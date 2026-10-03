# Owner demo verification

Date: 2026-09-28. Scope: static Web presentation and deployment preparation after Phase 10. No product feature, screen redesign, production business logic, repository implementation or dependency was changed. No Git commit or external deployment was made.

## Final report

| #   | Requested result                  | Evidence / result                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Ready to deploy?                  | **Yes, the optimized demo artifact and Netlify configuration are prepared.** Cloud-host behavior still requires a smoke check after a separately authorized deployment. This is not a production service release.                                                                                                                                                                                |
| 2   | Final tests                       | **966 passed / 84 suites / 0 snapshots**, unchanged baseline; 42 source test files run under both iOS and Android Jest projects. No new behavior was added that needs new unit tests.                                                                                                                                                                                                            |
| 3   | TypeScript / ESLint / Prettier    | `npm run typecheck`, `npm run lint` and `npm run format:check`: passed. `git diff --check`: passed.                                                                                                                                                                                                                                                                                              |
| 4   | Demo Web export                   | Fresh optimized `export:demo`: passed. **144 HTML pages**, one Web JS bundle, six bundled fonts; total artifact 6,508,530 bytes. `public/_redirects` is copied unchanged into `dist/_redirects`.                                                                                                                                                                                                 |
| 5   | Final viewports                   | **320×568, 390×844, 430×932, 1280×800: passed.** Main screens, map/list, store picker, filters, transfer and Club QR modals were checked. No document horizontal overflow or unusable clipping. Scrollable rows intentionally extend beyond their scroll container.                                                                                                                              |
| 6   | Console / runtime                 | **No captured console messages, warnings or errors** in the optimized normal flow, direct-route/reload checks or isolated fresh workspace. No OTP, token, private payload, secret or development diagnostic was logged. No failed chunk, broken image or stuck loading state was observed.                                                                                                       |
| 7   | Real Beerland inputs still needed | Official stores/hours/contacts, product/brewery ownership and photos, prices/stock/tap list, campaign rules, loyalty, delivery/payment, support/legal data and branding. All current business values are fictional or explicitly unavailable; see the inventory below.                                                                                                                           |
| 8   | Hosting recommendation            | **Netlify**; `netlify.toml` and artifact `_redirects` are included. Vercel and Cloudflare Pages need their own routing adaptation. GitHub Pages is not a fit for the current receipt fallback. See [host comparison](demo-deployment.md).                                                                                                                                                        |
| 9   | Exact build command               | `npm run export:demo`; it forces `EXPO_PUBLIC_APP_ENV=demo`, `EXPO_PUBLIC_DEMO_AUTH=0`, `EXPO_PUBLIC_DESIGN_SYSTEM=0` and clears Metro's cache.                                                                                                                                                                                                                                                  |
| 10  | Output directory                  | `/Users/ProKesha/projectsFamily/beerland/dist` (host publish directory: `dist`).                                                                                                                                                                                                                                                                                                                 |
| 11  | Exact preview command             | `npm run preview:web` → `http://127.0.0.1:4173`. The fresh review used `npm run preview:web -- --port 4175` → `http://127.0.0.1:4175`.                                                                                                                                                                                                                                                           |
| 12  | Required rewrites                 | Existing HTML/assets take precedence. Ungenerated `/product/:id`, `/store/:id`, `/order/:id` rewrite to the corresponding `local.html`; unknown paths use `+not-found.html` with HTTP 404. Preserve the URL and `/order/success`; do not force rewrites or replace every route with Home.                                                                                                        |
| 13  | Remaining share-link steps        | Obtain permission and choose the account/site/URL; upload the reviewed `dist/` or run the documented build; check HTTPS routing, reload, new local receipt, a clean second session, assets/map/console on that host; start a clean presentation session, then share its approved URL. [Exact deployment steps](demo-deployment.md#remaining-steps-before-sharing), [owner guide](owner-demo.md). |

## Fresh browser walkthrough

The new origin `http://127.0.0.1:4175` began at the age gate. No existing user site data was cleared. The walkthrough confirmed age, skipped onboarding and entered as a guest, then covered all 20 requested steps: Home, store selection, Today on tap, catalog, search, filters/sort, product, favorites, cart, store transfer, checkout, success, map/list, store detail, profile, Club, orders and settings.

Concrete behavior checked:

- Searching “лагер” returned six results; an unknown query returned a usable empty state. A lager filter applied from the scrollable 320px modal; ascending price sort and list view worked.
- Saved “Світлий берег” to favorites, selected its 1L variant and added it to the cart. Transfer from Demo 1 to Demo 2 updated 100 UAH to 105 UAH and changed fulfillment to pickup only.
- Blank checkout showed Ukrainian validation messages. Dummy contact data, payment on receipt and the separate age checkbox produced **BL-1042**, ID `mock-order-1042`, for 105 UAH. Success explicitly states that no payment or store fulfillment occurred.
- Map tiles and controls loaded; a marker selected its store card and opened store detail. Club displayed the demo points/card, and the enlarged QR modal closed normally.
- The new receipt survived direct navigation and reload. Settings exposed ordinary preferences and approved-content placeholders, with no test/reset/auth simulation actions.
- The transfer toast disappeared automatically. Cart and checkout CTAs were reachable after ordinary scrolling, including 320×568. Cart CTA bottoms were 484 / 760 / 848 / 716px, above tab tops 505 / 781 / 869 / 737px. Checkout CTA bottoms were 548 / 824 / 912 / 780px, inside the viewport.
- Desktop tabs occupied x=425…855, width 430px, inside the centered app shell. Other widths were 320 / 390 / 430px. Dialog content scrolled within the viewport.

Screenshots and DOM measurements come from this task's final `dist/`, not Phase 10 evidence. Review artifacts are under `.expo/owner-demo-browser/` (ignored, not published). Screenshot dimensions were checked against their named viewport before delivery.

## Direct navigation, reload and privacy

Each of the following reached its expected screen both directly and after reload:

```text
/
/catalog
/search
/product/product-1
/stores
/store/store-1
/cart
/checkout
/profile
/favorites
/orders
/order/mock-order-1042
```

`/catalog/` and `/order/mock-order-1042/` also passed direct/reload checks for trailing-slash compatibility. Empty cart/checkout states after submission remained usable.

The preview served the new receipt from `order/local.html` while the browser resolved its local ID. Missing safe product/store/order IDs showed Ukrainian missing-record recovery, without raw errors. An unknown route showed the branded missing-page screen. HTTP checks compared response bodies against actual exported files: **25/25 passed**, covering 18 route/fallback cases plus JS and all six fonts. `/order/success` served its own HTML; an unknown page and missing JS resource returned HTTP 404.

A second isolated origin on port 4176 first enforced age/guest entry. It could not find `mock-order-1042` either directly or after reload; its console was empty. The newly entered dummy comment was absent from all exported HTML. This demonstrates local guest receipt isolation, not production authorization. Existing `auth-isolation` and `account-isolation-polish` tests passed for private account ownership, corrupt/missing ledger recovery and stale asynchronous reads. Optimized auth stays disabled, so an account-authentication browser test was not performed.

Direct `/auth/phone` showed unavailable login with the OTP request disabled; `/auth/otp` returned to that screen. `/design-system` and `/phase6-review` returned to the missing-page screen. Production safeguards remain unchanged.

## Demo content inventory

| Area                     | Reviewed content and source                                                                                                                                                                                                                        | Real input needed                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Stores                   | Three “Beerland Демо” stores, explicitly fictional addresses/coordinates/hours; Demo 3 temporarily closed, Demo 2 pickup only. Store phones are `null`. `src/services/mock/fixtures.ts`.                                                           | Official pilot/location details, hours, phones, fulfillment rules.         |
| Catalog                  | 32 fictional products, breweries, ownership flags, serving variants, descriptions and metrics. Prices, stock, old prices and tap lists are mock; photos intentionally use fallback art. `fixtures.ts`, `catalogExpansion.ts`, `productDetails.ts`. | Official catalog/photos, brewery claims and live price/stock/tap sources.  |
| Promotions               | Two fictional editorial campaigns and demo price markers. `fixtures.ts`.                                                                                                                                                                           | Approved content, dates, pricing and campaign rules.                       |
| Club                     | 1,240 points, Silver, 760 to Gold, +45 demo activity; QR payload identifies itself as demo and cannot be redeemed. `src/services/mock/account.ts`.                                                                                                 | Membership/points/tier/redemption rules and service.                       |
| Orders / addresses       | Three explicitly demo historical receipts plus browser-created local receipts; dummy seeded identity/address, never real purchases. `accountOrders.ts`, `account.ts`.                                                                              | Order/receipt/status services and customer data policy.                    |
| Delivery / payment       | Demo delivery charge is 60 UAH; availability comes from fictional stores. Readiness/arrival time awaits confirmation; checkout does not charge or ask for card details.                                                                            | Official service areas, fees, timing and payment providers.                |
| Support / legal / assets | Support email and legal URLs are `null`; UI says they await Beerland approval. App artwork and product images remain placeholders. `src/config/customerSupport.ts`.                                                                                | Verified support details, legal documents, logo/photos and owner approval. |

These values are identified in mock source modules and this inventory; no new real-world Beerland facts or additional UI clutter were introduced.

## Reproducibility and limits

Commands actually run successfully:

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
EXPO_OFFLINE=1 npm run export:web -- --output-dir .expo/owner-demo-export-web --max-workers 2
EXPO_OFFLINE=1 npm run export:demo -- --max-workers 2
git diff --check
```

`EXPO_OFFLINE=1` disables Expo CLI network checks only; it does not turn the Web demo into an offline map app. The mandatory ordinary Web export was kept in a separate ignored directory, leaving `dist/` as the final demo artifact.

All eight local HTML asset references resolve to files. HTTP checks verified the bundle and six fonts; `document.fonts.status` was `loaded`, the heading used `Lora_600SemiBold`, and browser image checks found no broken images. This is a load sanity check, not a network-throttled performance benchmark. The artifact entry SHA-256 is `8d8a45b8c18a7261abdc497f0cc9c898d3b415a5dfb421783261271048518737`.

Build output had only empty-cache and terminal color-environment notices. Jest printed existing test-harness `act(...)` and incomplete Router fixture diagnostics; every test passed and these diagnostics did not appear in the optimized browser. No application runtime issue required a code change.

No native export or native runtime was rerun because this task changes only packaging/documentation. Browser viewport checks do not verify physical iOS/Android behavior; the Phase 10 device verification gap remains. External host canonicalization, HTTPS, CDN caching and deployed rewrites are also unverified until the explicitly authorized deployment and host smoke check.
