# Static owner demo deployment

Prepared on 2026-09-28. No external site, domain, account, paid resource or deployment was created. This is a demo release, not a production business application.

This is the original host comparison. For the current public-host findings, asset fix and redeployment instructions, see the [Netlify checklist](netlify-deployment.md), updated on 2026-09-29.

## Recommended: Netlify

Netlify is the best fit for the current artifact: its unforced fallback rules preserve generated pages and assets while supporting browser-created receipt IDs. The repository includes `netlify.toml`; Expo copies `public/_redirects` into `dist/_redirects`. [Netlify shadowing rules](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), [Expo static export](https://docs.expo.dev/router/web/static-rendering/).

| Setting                            | Exact value                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Project/base directory             | Repository root                                                           |
| Node                               | 22                                                                        |
| Dependency install                 | `npm ci` (lockfile)                                                       |
| Build command                      | `npm run export:demo`                                                     |
| Publish/output directory           | `dist` (absolute locally: `/Users/ProKesha/projectsFamily/beerland/dist`) |
| `EXPO_PUBLIC_APP_ENV`              | `demo`                                                                    |
| `EXPO_PUBLIC_DEMO_AUTH`            | `0`                                                                       |
| `EXPO_PUBLIC_DESIGN_SYSTEM`        | `0`                                                                       |
| Pretty URLs                        | Enabled in `netlify.toml`                                                 |
| Backend/API/SMS/payment/map secret | None                                                                      |

The build script forces the three demo flags even if the build environment differs. Host deployment contexts named “production” are unrelated to `EXPO_PUBLIC_APP_ENV`: keep the app flag `demo`. Changing it to `production` deliberately blocks the export. All `EXPO_PUBLIC_*` values are public build inputs; do not put secrets there. [Netlify build configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

### Routing included in the artifact

```text
/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf /Feather.ttf 200
/assets/node_modules/* /host-assets/:splat 200
/product/:id /product/local.html 200
/store/:id /store/local.html 200
/order/:id /order/local.html 200
/* /+not-found.html 404
```

These are rewrites, preserving the requested URL. The first rule maps the Feather font request to the short root file because the public host did not serve that deep asset after the first corrected upload. The second maps the other package assets to the mirrored `dist/host-assets/` tree. Do not add `!` or `force=true`. Existing files win, including `/order/success`, known product/store pages and chunks. Normal extensionless pages resolve to their exported HTML; Netlify may canonicalize them with a trailing slash. The last rule returns the app's missing-page screen with HTTP 404. Do not replace it with a universal `/index.html 200` SPA fallback. [Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

The local preview validates safe entity IDs (`A–Z`, `a–z`, digits, hyphen; 1–80 characters). Netlify named segments are broader; the app still validates IDs and handles missing records without exposing data. A route rewrite is not authorization. Receipts are resolved through the current local guest/account workspace; static HTML contains no saved customer receipt. A fresh browser cannot see a receipt created elsewhere, even with its URL.

### Later deployment choices

To update the existing Netlify project, upload the **entire reviewed `dist/`**, including `_redirects` and `host-assets/`; this needs no source commit. Alternatively, use a repository deployment with the root configuration above after its source is committed and pushed. Do not upload `.env`, `.git`, local browser storage or the workspace. No paid option is required by this configuration.

## Other hosts evaluated

| Host             | Fit for this export                      | Required adaptation                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel           | Suitable alternative                     | Framework preset `Other`, build `npm run export:demo`, output `dist`, the same three env flags, `cleanUrls: true`. Use entity rewrites to `/product/local`, `/store/local`, `/order/local` (without `.html`), with filesystem precedence. Configure the app 404 separately and verify generated `/order/success` before sharing. Netlify `_redirects` is not a Vercel config. |
| Cloudflare Pages | Suitable after routing adaptation        | Same build/output/env. Replace the Netlify `_redirects`: Cloudflare rules also override existing assets and do not support the Netlify 404 rule. Preserve `/order/success` with a specific rule before entity fallbacks, and supply top-level `404.html` from the exported missing-page HTML to avoid its automatic SPA fallback. Verify known pages and dynamic receipts.    |
| GitHub Pages     | Not recommended for the current artifact | A custom 404 page alone does not supply 200 entity rewrites. Repository subpath hosting also needs a deliberate base-path export. It would require a separate routing approach and new verification; this task makes neither change.                                                                                                                                          |

Sources: [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json), [Cloudflare redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Cloudflare page matching](https://developers.cloudflare.com/pages/configuration/serving-pages/), [GitHub Pages custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

## Local preview

```sh
npm run export:demo
npm run preview:web
```

Default URL: `http://127.0.0.1:4173`. For a clean separate origin, use `npm run preview:web -- --port 4175`. The preview serves loopback only, resolves real files before entity fallbacks and disables caching. It is not a cloud-host emulator or a shareable external URL.

## Remaining steps before sharing

1. Use the existing `https://beerland-app-demo.netlify.app/` project for the corrected deployment.
2. Upload the reviewed `dist/` or perform a source build using the exact settings above.
3. On that HTTPS host, run a clean-session age/guest/checkout walkthrough and direct navigation plus reload for `/`, `/catalog`, `/search`, `/product/product-1`, `/stores`, `/store/store-1`, `/cart`, `/checkout`, `/profile`, `/favorites`, `/orders` and a newly created `/order/<id>`.
4. Confirm `/order/success`, unknown-route 404, asset/font/chunk loading, map access, disabled auth/debug controls and no private local receipt in a second fresh session. Check 320×568 and desktop shell/CTAs and inspect the console. Turn off the Netlify badge that currently overlaps the bottom tabs. The corrected asset rewrite still needs verification on the public host.
5. Start a fresh presentation session, explain that business data/services are mock, then share the approved HTTPS URL and follow the [10–15 minute guide](owner-demo.md).
