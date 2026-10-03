# Owner demo

This is a frontend presentation with fictional business data. It cannot send SMS, charge money or place an order with a Beerland store. Use dummy contact/address data only.

## Build and open

Use Node.js 22 and Chrome or Edge on a computer with internet access. The map needs external scripts and tiles; the store list remains available if they fail.

```sh
npm ci
npm run export:demo
npm run preview:web
```

Open `http://127.0.0.1:4173`. Output is `dist/`. The build script supplies `EXPO_PUBLIC_APP_ENV=demo`, `EXPO_PUBLIC_DEMO_AUTH=0` and `EXPO_PUBLIC_DESIGN_SYSTEM=0`. No API URL, account, payment credential or map key is needed. Phone login and development controls are unavailable in this optimized build.

## Clean start / reset

Before each presentation, use a fresh browser profile. Alternatively, close all of your private windows in the chosen browser/profile before opening a new private window: private windows share one storage session. If existing private windows contain needed work or belong to somebody else, use a fresh profile instead. Close the presentation's private windows afterward. A new tab alone does not reset saved state.

For local review, an unused port provides a separate origin without changing anyone's saved data:

```sh
npm run preview:web -- --port 4175
```

Open `http://127.0.0.1:4175`. If it has been used before, choose another unused port. Always use one exact origin throughout the presentation so the local receipt survives reload.

To reset your own regular-browser workspace, close the demo tabs, remove site data for this exact demo origin through browser settings, then reopen it. This removes its locally saved cart, favorites, addresses, age choice and receipts. Do not clear all browser data or somebody else's demo workspace. There is no public reset button.

## 10–15 minute walkthrough

| Time      | Sequence                                                                                                                                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–2 min   | **Age gate → guest entry → Home.** Confirm 18+, complete or skip onboarding and enter as guest. This is self-declaration. Show the shared navy and gold shop navigation on mobile and desktop.                                                                                                                             |
| 2–4 min   | **Store selection → Today on tap → Catalog.** Choose Beerland Demo 1. Show that assortment belongs to the selected store; addresses and locations are explicitly fictional.                                                                                                                                                |
| 4–6 min   | **Search → filters/sorting → Product Detail → Favorites.** Search for a lager, show a no-result query and clear it. Try a filter/sort, open a product, review sizes and save a favorite. Product photos currently use an intentional fallback.                                                                             |
| 6–9 min   | **Cart → store transfer → Checkout → success.** Add a product, then select Demo 2 with a populated cart. Review transfer prices/availability and correct unavailable lines. Demo 2 supports pickup only. Enter dummy contact details, choose mock payment, confirm age and submit. No payment or store fulfillment occurs. |
| 9–11 min  | **Map/list → Store Detail.** Switch views, select a marker and open its store. Zoom or use the list for overlapping nearby pins. The list is the fallback when map loading fails.                                                                                                                                          |
| 11–13 min | **Profile → Beerland Club → Orders → Settings.** Show the demo points and enlarged QR (not redeemable), the new local receipt and its direct-link reload, then notification preferences/settings. Support/legal contacts await Beerland approval.                                                                          |
| 13–15 min | Ask for the decisions below and record corrections to the fictional data separately from UX feedback.                                                                                                                                                                                                                      |

## Real frontend behavior vs. mock services

**Implemented:** navigation, age/onboarding entry, selected store, catalog search/filter/sort, favorites, quantities and totals, store transfer review, form validation, map/list, local receipts/reorder review, addresses and notification preference persistence.

**Demo/mock:** all stores/hours/coordinates, products/breweries/tasting notes/photos, prices/stock/tap lists, promotions, delivery cost/availability, orders/statuses, Club tiers/points/QR and payment choices. Local receipts exist only in this browser/origin. SMS login, payment, store fulfillment, POS/CRM/inventory and push delivery are not connected. Official support/legal links and branding remain pending.

## Questions for the owner

1. Does the overall UX fit Beerland? Is the visual style acceptable?
2. Which store should be the first real pilot?
3. What POS, CRM and inventory system is used today?
4. Where do real product prices and stock come from? Who maintains the tap list?
5. What are the real loyalty rules, tiers and redemption rules?
6. Which delivery and payment services are used?
7. Who can supply the official logo, product photos, store details/hours and support/legal information?

See [deployment notes](demo-deployment.md) for hosting and [fresh verification](owner-demo-verification.md) for the tested artifact. Deployment requires a separate instruction.
