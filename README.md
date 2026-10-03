# Beerland

Ukrainian React Native / Expo / TypeScript application for iOS, Android and Web. Phases 1–9B provide discovery, commerce, store maps, account screens, age-gated guest entry and internal demo phone authentication. Phase 10 polishes this frontend and documents integration and release requirements.

**The app currently uses fictional data and local demo orders.** There is no production backend, SMS, payment processing, POS, inventory synchronization or push delivery. Production mode deliberately fails closed. The shopping UX update is implemented and browser verified; physical iPhone and Android verification remains pending. See the [shopping UX report](docs/shopping-ux.md) and [Phase 10 verification report](docs/phase-10-verification.md).

## Shopping UX update

The current frontend includes a shared cart-position badge, compact quantity controls and explicit commerce groups:

- Cart badges count distinct active `(product, variant, store)` lines and announce the exact Ukrainian count. The visual badge caps at `99+`.
- Draft products move only through repository-defined available serving sizes. Packaged products keep integer piece counts, and measured snacks keep their declared units such as `г`.
- Home and Catalog expose `Сьогодні на кранах`, `Сьогодні в пляшках`, `Смаколики` and `Інші товари` without removing detailed categories, search, filters, sorting or list/grid mode.
- Cart keeps draft serving selection separate from integer portion quantity. Store availability, limits, transfer and persistence remain enforced by the existing repository and Zustand architecture.

The implementation does not add backend integration, packaging fees or a new deployment path. The future packaging extension point is documented in [docs/shopping-ux.md](docs/shopping-ux.md).

## Start locally

Use Node.js 22.13+ (checked with 22.17.0) and npm:

```sh
npm ci
cp .env.example .env
npm run web
```

| Target               | Command                                          | Requirement                           |
| -------------------- | ------------------------------------------------ | ------------------------------------- |
| Web development      | `npm run web`                                    | Browser                               |
| iOS development      | `npm run ios`                                    | Full Xcode and compatible Simulator   |
| Android development  | `npm run android`                                | Android SDK and emulator/device       |
| Device through Expo  | `npm start`                                      | Client compatible with Expo SDK 57    |
| Optimized owner demo | `npm run export:demo` then `npm run preview:web` | Browser; open `http://127.0.0.1:4173` |

The preview serves `dist/` locally; it does not deploy anything. It supports extensionless static pages and refresh of locally created `/order/[id]` routes. For an alternate port use `npm run preview:web -- --port 4174`.

## Environment

Configuration is validated in `src/config/environment.ts`; Expo public variables are read directly in `src/config/env.ts`.

| Variable                    | Values / default                                                                            | Effect                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`       | `development`, `demo`, `production`; default is development under `__DEV__`, otherwise demo | Development/demo use mock repositories. Production repositories are unavailable until real adapters exist. |
| `EXPO_PUBLIC_API_URL`       | Optional URL; blank is allowed                                                              | Public future endpoint setting; specifying it does not connect a backend.                                  |
| `EXPO_PUBLIC_DEMO_AUTH`     | `0` by default; `1` for internal development                                                | Requires `__DEV__` and a nonproduction environment. Never enabled in optimized exports.                    |
| `EXPO_PUBLIC_DESIGN_SYSTEM` | `0` by default                                                                              | Explicit internal showcase flag, also requires `__DEV__` and a nonproduction environment.                  |

All `EXPO_PUBLIC_*` values are public client configuration. Never store secrets there. `.env*` files are ignored except `.env.example`. Invalid configuration shows a Ukrainian recovery screen; it does not silently switch to mock production authentication. `app.config.js` blocks production builds even when an API URL is supplied.

To demonstrate authentication privately:

```sh
EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_DEMO_AUTH=1 npm run web -- --clear
```

The internal demo code is `123456`; no SMS is sent. OTP challenges expire, enforce resend/attempt limits and reject replay. Demo sessions last 30 days. This is local simulation, not secure identity or age verification. The optimized owner demo preserves guest commerce and the 18+ entry flow but disables phone login and all development controls. See [owner demo](docs/owner-demo.md) for the public presentation.

## Architecture

```text
app/                         Thin Expo Router routes and guarded layouts
src/components/              Shared theme-based UI, frame, providers, recovery
src/features/                Discovery, product, stores, cart, checkout, account,
                             orders, auth and first-launch flows
src/repositories/            Async contracts, injection, composition and ownership
src/services/mock/           Explicit fictional fixtures and demo adapters
src/services/api/            Reserved real-adapter boundary
src/stores/                  Local choices, workspaces, preferences and memory session
src/config/                  Typed environment and QueryClient configuration
src/theme/                   Color, typography, spacing, radius and layout tokens
src/assets/                  Neutral local product fallback and image resolver
src/__tests__/               Behavior, state, repository, component and route tests
```

```text
route -> feature -> query hook -> injected repository -> adapter
```

UI never imports mock fixtures; ESLint enforces the boundary. `RepositoryProvider` allows isolated test implementations. TanStack Query owns fetched data, while Zustand owns local choices. Account query keys include their owner; responses resolving after an identity switch cannot publish another account's data. Owner-specific forms and workspace snapshots isolate cart, favorites, addresses, contact drafts, fulfillment and store selection.

Money uses integer minor units, currently UAH. Cart identity includes product, variant and store; prices are revalidated, not persisted as cart truth. Store hours use the store timezone (default `Europe/Kyiv`). Ukrainian price/quantity/date formatting lives in shared utilities and feature transformations.

The map adapter uses MapLibre / OpenFreeMap in a Web iframe or native WebView. It requires network access but no user-location permission. List fallback remains available. Notification toggles are local preferences; they do not enable push notifications.

Read [integration contracts](docs/integration-readiness.md), [persistence and ownership](docs/persistence.md), and [release prerequisites](docs/release-readiness.md) before connecting real services. Local demo persistence includes entered contact/address data and is **not encrypted credential storage**. Real native credentials need a secure storage adapter; production Web needs a backend-managed session.

## UI and performance

Visible copy is Ukrainian. The navy, gold and red shop direction now runs through first launch, authentication, discovery, product details, stores, cart, checkout, orders and account screens. A shared shop chrome, gold page banners, accent actions and code-drawn product illustrations keep the flows consistent when catalog photos are unavailable. Lora headings and Manrope UI text remain. The Web frame expands to 1200px, while detail content is centered within 840px and entry flows keep their narrow shell. Safe areas belong to Screen, sticky actions and tabs at their respective boundaries.

Catalog/search are virtualized and pagination-ready; search is debounced. Favorites and orders now share a virtualized account list. Images reject unsafe URLs and recover from failure/stalled loading. Startup waits for hydration, first launch and the correct workspace/session; recovery paths and font timeout avoid indefinite loading. Native stack transitions respect reduced motion. Accessible controls, stable test IDs and touch targets preserve future Maestro compatibility; no E2E framework was added.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run format:check
npm run export:web
npm run export:demo
npm run export:ios
npm run export:android
git diff --check
```

For reproducible demo exports, set `EXPO_PUBLIC_APP_ENV=demo`, `EXPO_PUBLIC_DEMO_AUTH=0` and `EXPO_PUBLIC_DESIGN_SYSTEM=0`; `export:demo` supplies these for Web. iOS/Android export scripts write JavaScript/Hermes artifacts under `.expo/exports/`; they do not build or run installable native applications.

The final shopping UX verification passed **1176 checks across 96 suites** under both iOS and Android Jest presets, with zero snapshots. Jest presets and successful exports do not substitute for real devices: this workspace has no usable `simctl`, Android `adb` or emulator. Home, Catalog, Cart, Favorites and Product Detail were browser-verified at 320×568, 390×844, 430×932 and 1280×800. Current deployment results are in the [Netlify checklist](docs/netlify-deployment.md); historical results and remaining device checks are in the [Phase 10 report](docs/phase-10-verification.md).

## Dependencies and builds

Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router, React Native Web, TypeScript, Zustand, TanStack Query, Zod and React Hook Form remain in place. No dependency upgrade was made in Phase 10. React Test Renderer must match React exactly; Testing Library 13.3.3 is pinned for the installed Router testing helpers. Use `npx expo install` for Expo/native dependency changes and consult the [versioned SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/).

EAS profiles describe development, internal demo preview and blocked production. No cloud build or submission was run. The development-client profile still needs `expo-dev-client`, approved application IDs and native tooling before use. Signing, developer accounts, final branding, official data, production services and business/legal decisions remain prerequisites. Existing icons and splash artwork are temporary placeholders.

The internal showcase starts with `npm run design-system`. `npm run export:design-system` creates an intentionally unoptimized internal review export; it must never be used as the public owner demo.

## Documentation

- [Shopping UX: cart badge, quantities and commerce groups](docs/shopping-ux.md)
- [Phase 10 audit and verification](docs/phase-10-verification.md)
- [Owner demo walkthrough](docs/owner-demo.md)
- [Static demo deployment settings](docs/demo-deployment.md)
- [Netlify deployment checklist](docs/netlify-deployment.md)
- [Fresh owner demo verification](docs/owner-demo-verification.md)
- [Real integration contracts](docs/integration-readiness.md)
- [Persistence, migration and ownership](docs/persistence.md)
- [Release checklist and exact device test plans](docs/release-readiness.md)

Earlier `docs/phase-*-verification.md` files are historical checkpoints. No backend integration, external deployment or later development phase was started.

## Commit and push

Review the staged diff before creating the commit. These commands prepare and push the current `main` branch to the configured `origin` remote:

```sh
git status --short
git diff
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: improve shopping UX"
git push -u origin main
```

The push command is intentionally documented only; deployment remains handled by the existing GitHub → Netlify workflow.
