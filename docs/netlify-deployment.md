# Netlify owner demo deployment

Prepared on 2026-09-29; the latest local handoff was rebuilt on 2026-09-30. The existing public demo is [beerland-app-demo.netlify.app](https://beerland-app-demo.netlify.app/). The corrected font and icon assets were deployed and verified on the public host on 2026-09-29. The Netlify badge still needs a fresh check before sharing the link with the owner. This is a frontend demonstration with synthetic data and local receipts.

**Current local artifact:** `/Users/ProKesha/projectsFamily/beerland/dist` was rebuilt with `npm run export:demo` after the latest interface changes. It contains 144 HTML pages, 203 files and 24 byte-identical mirrored package assets (9,761,605 bytes total). The entry bundle SHA-256 is `28f866078953475309e8b2c1e6fcbcc535f9eb249dfd59ef083e5c0145045847`. TypeScript, lint, Prettier, all 988 tests in 88 suites, the ordinary Web export, the demo export and `git diff --check` passed. The local catalog opened from this rebuilt artifact. This checkout has no Git remote or `.netlify` site link, so the ready path is a manual upload of the entire `dist` folder to the existing project's Deploys page. The public host has not been updated with this artifact yet.

## 1. Preconditions

- Use the approved Netlify account/team and demo project name. No custom domain or paid add-on is required by this configuration.
- Local repository root: `/Users/ProKesha/projectsFamily/beerland`.
- Node.js **22**, npm and the committed dependency lockfile are required for builds. Start with `npm ci` in a fresh checkout.
- Internet access is required for map scripts/styles/tiles. No backend, SMS, payment or map credential is needed.
- **Git option is conditional:** the current app implementation, `netlify.toml`, `public/_redirects` and both demo scripts have local uncommitted/untracked changes. An approved source commit and push must happen before Netlify can build this version from Git. No commit was created during this task. Manual upload of the reviewed `dist` does not need a commit.

## 2. Build command

```sh
cd /Users/ProKesha/projectsFamily/beerland
npm run export:demo
```

This existing script runs a fresh optimized Expo Web export and forces all three demo flags. Do not substitute `npm run web` or a development server.

Compared with Metro development, this artifact serves generated HTML and hashed assets without hot reload; entity refresh needs the included rewrites. Internal OTP/reset/review controls are unavailable in optimized mode. Guest commerce behavior is preserved. No development-server rerun was needed for this packaging check.

## 3. Output directory

Netlify publish directory: **`dist`**, relative to the repository root. Locally: `/Users/ProKesha/projectsFamily/beerland/dist`.

The uploaded folder must contain `index.html`, `_redirects`, `+not-found.html`, route HTML, `_expo/`, `assets/`, **`host-assets/`** and **`Feather.ttf`** directly inside it. `export:demo` copies the exported package assets into `host-assets/` because the public host returned 404 for requests under `/assets/node_modules/`. The host also omitted the deep Feather icon font after the first corrected upload, so its font bytes are copied to the root as `Feather.ttf`. Upload the **entire `dist` folder itself**, preserving its contents; do not upload the repository root, the source `public/` directory or a parent folder containing `dist`.

## 4. Public environment variables

| Variable                    | Exact value |
| --------------------------- | ----------- |
| `EXPO_PUBLIC_APP_ENV`       | `demo`      |
| `EXPO_PUBLIC_DEMO_AUTH`     | `0`         |
| `EXPO_PUBLIC_DESIGN_SYSTEM` | `0`         |

These are public build inputs, already supplied by the script and `netlify.toml`; they are not secrets. For manual upload they are already compiled into the artifact. For Git builds, retain these values for every build context. Leave `EXPO_PUBLIC_API_URL` unset; remove any inherited API URL from a reused host project. No secret is required. Netlify's production deployment context does not mean the app flag should be `production`; that app mode is intentionally blocked.

## 5. Netlify configuration

Root `netlify.toml` sets build command `npm run export:demo`, publish directory `dist`, `NODE_VERSION=22`, the three flags above and `pretty_urls=true`. **Base directory: leave blank** (repository root). Package directory is also unnecessary for this single-package repository. Use a static/Other preset if prompted; no server adapter or Functions are required. [File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

Expo copies `public/_redirects` unchanged into `dist/_redirects`:

```text
/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf /Feather.ttf 200
/assets/node_modules/* /host-assets/:splat 200
/product/:id /product/local.html 200
/store/:id /store/local.html 200
/order/:id /order/local.html 200
/* /+not-found.html 404
```

Existing exported pages and assets win. The first rule serves the Feather icon font from the short root path; it must precede the general package asset rule. The second rule serves the remaining package assets from their mirrored paths; `:splat` retains the complete relative path. Ungenerated entity IDs use their generic HTML while keeping the requested URL; the browser then resolves the current local workspace. `/order/success` keeps its own page. Unknown routes return the branded 404. Do not add force markers or a blanket `/* /index.html 200`; do not duplicate these rules in the TOML. Pretty URLs may add a trailing slash, which is included in the smoke check. [Rewrite precedence](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), [redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

A rewrite does not authorize access to an order. A receipt created in one browser workspace is absent from a fresh workspace even when its URL is known. No customer receipt is embedded in static HTML.

## 6. Option A — drag-and-drop

1. Run the build in section 2. Preview those exact files with `npm run preview:web`; open `http://127.0.0.1:4173`. If occupied, use `npm run preview:web -- --port 4177` and that port's URL.
2. Sign in to the approved Netlify team. Open the existing **beerland-app-demo** project, then its **Deploys** page and manual deploy dropzone.
3. Drag `/Users/ProKesha/projectsFamily/beerland/dist` into that dropzone. This uploads prebuilt files to the existing project; no source build or environment entry is needed for this artifact.
4. Wait for the deploy to finish and retain the existing project's HTTPS URL. In **Project configuration → Developer settings → Post processing → Pretty URLs**, confirm it is enabled; the root TOML was not part of this manual upload.
5. Check project visibility from a fresh signed-out/private browser: some teams create private projects by default. Use the approved public demo visibility before sharing. Run section 8 before sending the link.

Updates: rebuild locally, then drop the new **entire `dist`** into the existing project's **Deploys** dropzone to retain its URL. Confirm `host-assets/` and `_redirects` are included. [Manual deployment](https://docs.netlify.com/manage/projects/add-new-project/).

## 7. Option B — Git-connected builds

1. After separate approval, commit and push the complete reviewed app source, `package.json`, `package-lock.json`, config, scripts and `public/_redirects` to the chosen repository/branch. Keep `.env`, dependencies, `.expo/` and generated `dist/` excluded. Verify the remote branch contains this version; local changes are not visible to Netlify.
2. In the approved team, choose **Add new project → Import an existing project**, choose the Git provider, grant access to that repository and select the approved branch. No remote or branch name is assumed here.
3. Set **Base directory blank**, **build `npm run export:demo`**, **publish `dist`**, **Node 22**. Confirm root `netlify.toml` is detected; it supplies the same settings, flags and Pretty URLs. Remove contradictory host overrides or an inherited API URL.
4. Confirm with **Publish** only when approved. Check the build log identifies the intended commit, Node version and command; then verify the deployment file browser includes `_redirects`, entity `local.html` files, `/order/success.html`, JS and fonts.
5. Future pushes to the configured branch trigger builds. Confirm approved visibility and complete section 8 on the HTTPS URL before sharing. [Repository setup](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).

## 8. Route/reload verification after publishing

Start in a clean session: age gate → confirm 18+ → complete/skip onboarding → guest entry. Use dummy contacts only. Check navigation, browser Back/Forward and direct opening plus reload for:

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
/order/<new-local-receipt-id>
```

- Save a favorite, add a product, reload to check persistence, submit a demo checkout and use its newly created receipt URL. `/order/success?id=<id>` must show the success page. Reopen the receipt and reload on the same origin; a second fresh session must report it unavailable.
- Test `/catalog/`, `/order/<id>/`, missing `/product/unknown-item`, `/store/unknown-store`, `/order/unknown-order`, and `/unknown-page` (HTTP 404). Confirm no redirect loop or generic Home fallback.
- Inspect Console and Network: no uncaught/React errors, failed JS chunks, failed local asset requests or private diagnostics. Fonts, favicon and artwork must load; map controls/tiles and the store-list alternative must work.
- Check that all six font requests under `/assets/node_modules/` return HTTP 200 and that Manrope, Lora and Feather actually render. The Feather request now rewrites to `/Feather.ttf`; the other five use `/host-assets/`.
- Turn off the project-level **Powered by Netlify badge** in **Project configuration → General → Powered by Netlify badge**, then save. It currently overlaps mobile navigation. The setting takes effect on the next request without a redeploy. [Netlify badge settings](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/).
- Verify 320×568, 390×844, 430×932 and 1280×800: age gate, Home, Catalog, Product, populated Cart, Checkout, Map and Profile. Check scrolling, bottom actions, tabs and horizontal overflow.
- `/auth/phone` must disable OTP requests; `/auth/otp` must return to unavailable login. `/design-system` and `/phase6-review` must return the missing-page screen. Settings must have no first-launch reset or auth simulation controls.

The local preview verifies the exported files and app behavior. It does not emulate Netlify's CDN, HTTPS, URL normalization or post processing, so the public-host check remains required.

## 9. Clean presentation / reset

**Safest:** use a fresh browser profile. Alternatively, close all of your own private windows for the chosen browser/profile, then open a new private window and the exact demo URL. Private windows share a storage session; a new tab alone does not reset it. Do not close somebody else's work.

For your own Chrome/Edge regular-browser demo workspace:

1. Close other tabs for this exact demo origin so they cannot restore old state.
2. Open the demo URL and Developer Tools → **Application → Storage** (sometimes labeled **Clear storage**).
3. Confirm the displayed origin is this exact `https://<project>.netlify.app`; select its site storage and click **Clear site data**. Keep the optional third-party cookie clearing unchecked. This removes only that origin's saved age/onboarding choice, cart, favorites, store, addresses, local receipts and preferences. Do not use the browser's all-sites clearing command.
4. Reload. The first screen must be **18+ age verification**, followed by onboarding and guest entry. Nothing needs to be prefilled. For the owner walkthrough, choose **Beerland Демо 1** and use dummy contact details when checkout is shown.

Use the same origin throughout the presentation. Changing the domain creates a separate workspace. No public reset button was added. [Presentation guide](owner-demo.md), [Chrome Application panel](https://developer.chrome.com/docs/devtools/application).

## 10. Rollback / redeploy

- In **Deploys**, open an available previous successful deploy and select **Publish Deploy** to restore those static files. For Git sites, **Lock to stop auto publishing** prevents a later automatic build from replacing the rollback; unlock when ready.
- Manual: rebuild the reviewed source and upload the complete new `dist` to the same project's Deploys dropzone. Git: publish the approved corrected commit, or use **Trigger deploy** to rebuild the branch's current HEAD; clear build cache if resolving a stale-build issue.
- Recheck section 8 after every redeploy. Rollback changes hosted files; it does not reset visitors' local storage. Retain a copy of the reviewed artifact because old deploys may expire. [Deploy management](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

## 11. Verification and known limitations

The following table records the **pre-publication local** verification on 2026-09-29 against a fresh `dist` using `npm run preview:web -- --port 4177`. The current public deployment has separate failures below:

| Gate                                        | Result                                                                                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full Jest suite                             | **968 passed / 84 suites / zero snapshots**; previous baseline 966.                                                                                                                                         |
| TypeScript / ESLint / Prettier / whitespace | `typecheck`, `lint`, `format:check`, `git diff --check`: passed.                                                                                                                                            |
| Web and optimized demo export               | Both passed; final upload artifact is `dist`, 144 HTML pages, six fonts, 173 files, 6,507,373 bytes.                                                                                                        |
| Direct routes / reload                      | All 12 routes above passed, including newly created receipt `mock-order-1042`; success reload, missing records, trailing slash, Back/Forward and saved cart/favorite passed.                                |
| Local HTTP audit                            | **33/33 passed**: 25 route/fallback cases and all eight HTML asset references (JS, six fonts, favicon) matched actual exported bytes and expected statuses.                                                 |
| Responsive Web                              | All eight requested screens at all four sizes passed; populated Cart/Checkout bottom actions stayed visible after scrolling, tabs stayed inside the viewport, no page horizontal overflow or broken images. |
| Console                                     | No captured messages, warnings or errors in the main walkthrough or clean second workspace. Map scripts, controls and tiles loaded.                                                                         |
| Static safety                               | No demo OTP value, source maps, `.env` files, real credentials, local workspace paths, localhost asset URLs or prior saved customer receipt content detected. Synthetic fixtures remain intentional.        |
| Fresh workspace                             | Origin 4178 enforced age/onboarding/guest entry, then could not find the other workspace's receipt, including after reload. This is local isolation, not production authorization.                          |

**Earlier deployment-specific fix:** the previous optimized JS still bundled the internal OTP value and two hints although login was disabled. `__DEV__` guards now exclude those values/hints during optimized export and prevent the mock auth provider from accepting an enabled flag there. One behavior regression was added (two checks across iOS/Android Jest presets); internal development login behavior remains covered by the passing existing tests. This historical check predates the asset rewrite above.

Commands run: `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, `git diff --check`, and both export scripts with `EXPO_OFFLINE=1` and `--max-workers 2`. Ordinary `export:web` output was isolated at `.expo/netlify-final-export-web`; `export:demo` used `dist`. `EXPO_OFFLINE` only skips CLI network checks. The final entry SHA-256 is `9194734c294b4eb3dc5ff45f3699307ea2ffcde6f8446896a55b55642c4a183a`.

Ignored evidence: `.expo/netlify-final-artifact.json`, `.expo/netlify-final-http.json`, `.expo/netlify-final-browser/` and `.expo/netlify-final-jest.log`. They are outside the uploaded artifact. The initial concurrent build/test run hit one existing navigation test's 5-second timeout; the full rerun without a simultaneous export passed in 47.022 seconds. Test assertions/timeouts were not weakened. Existing Jest `act(...)`/Router fixture diagnostics were absent from the optimized browser.

No real backend, SMS, payment, POS/CRM, stock synchronization or store order fulfillment is connected. Business data and Club benefits are synthetic; product images use placeholder artwork. Support/legal documents still need Beerland approval. External map resources require network access.

Current public URL: **https://beerland-app-demo.netlify.app/**. The first live audit passed **26/32 cases**: all 24 route cases, the JS bundle and favicon passed; all six font requests returned HTTP 404. Eleven main routes rendered after direct navigation and reload in a real browser. The first corrected upload brought five text fonts to byte-correct HTTP 200, while Feather remained 404. The second manual production deploy (`6abc20ed1d89386fd233709d`) processed **six redirect rules**. All six font requests and `/Feather.ttf` now return HTTP 200 with `font/ttf`; the requested font bytes match the local `dist`. At 320×568, `document.fonts.check` reports Lora, Manrope and Feather loaded, and the icons render. One reload captured no browser console errors. The **Powered by Netlify badge remains visible and overlaps the bottom tabs**; disable it in project settings before the owner presentation. Earlier reloads had produced a `MutationObserver.observe` exception, so the console should be checked again after the badge is disabled. A custom domain can be connected later if Beerland approves the project. [Netlify project URLs](https://docs.netlify.com/manage/projects/how-projects-work/).

The 2026-09-29 corrected **local** export passed `typecheck`, `lint`, all **972 tests in 86 suites**, `format:check`, both Web exports and `git diff --check`. Its `dist` contained 144 HTML pages and 202 files, including 24 byte-identical mirrored package assets, the root `Feather.ttf`, and four font/icon license notices. The local HTTP preview returned 200 and `font/ttf` for `/Feather.ttf`. The font rewrite passed on the public host; badge-free layout and the final signed-out walkthrough remain to be checked after the next upload.

Before sending the link: turn off the badge, repeat the signed-out HTTPS smoke check, and tell the owner that data/orders are demonstrational. Future Git deployment additionally requires a source commit/push of the current local version. Physical iOS/Android runtime verification remains pending; responsive Web checks do not replace it.
