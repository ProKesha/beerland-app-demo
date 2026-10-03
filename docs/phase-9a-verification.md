# Phase 9A — age gate, onboarding and guest entry

First-launch data has one versioned key, `beerland:first-launch:v1`. It stores only the age self-declaration, whether onboarding was completed, and whether guest entry was chosen. No date of birth or authentication credential is stored. A missing, malformed or unreadable age record never grants access. Writes finish before a choice changes navigation; a write failure leaves the previous stage visible with a retryable message.

Existing cart, store, favorites, addresses, local profile and orders keep their original keys. When the first-launch key is absent, meaningful prior local use skips only the introductory slides and guest prompt. The user must still confirm adulthood. The checkout 18+ confirmation remains separate. The app never treats its self-declaration as verified identity.

Every main route lives under `app/(main)`. That layout waits for the session and first-launch load, then routes an unconfirmed or underage user to the proper screen without mounting protected content. Product deep links carry only a validated internal product ID through the first-launch screens. The root web export renders a neutral startup state before browser storage is read; it cannot server-render protected product content.

The three onboarding illustrations are original SVG compositions built with the installed `react-native-svg` package. The screens use the existing Lora, Manrope, colors, safe-area and button components. They do not request notification permission or depend on a network response. Settings has a review action that does not change any saved data. Development builds alone show a first-launch reset button; it overwrites only the first-launch key with a fresh versioned record, so testing again does not erase customer data and survives a reload.

## Physical iPhone / Expo Go

1. Test the upgrade on the existing installation first. Note the current cart, selected store, favorites, addresses and local orders. Start the current project with `npm run start`, scan its QR code in Expo Go, confirm age, and verify those records remain. An installation with prior local use should continue directly to Home without repeating introductory slides.
2. In a development build, open **Налаштування → Перевірити перший запуск (розробка)**. This resets only the first-launch record; do not uninstall Expo Go or clear app storage. Check that the age screen appears and its two actions are reachable with VoiceOver.
3. Choose **Ні, мені немає 18**. Check the restricted screen has no catalog or checkout, then force-close and reopen the app: it must remain restricted. Use **Обрано помилково? Повернутися** to correct the choice.
4. Choose **Так, мені є 18**. Move through all three slides with **Далі** and **Назад**, check the page indicators and safe-area spacing, then use **Почати**. Repeat the development reset to test **Пропустити** after age confirmation.
5. Tap **Продовжити як гість** and check Home, Catalog, Favorites, Cart, Profile and locally saved data. Force-close and reopen: Home should appear without repeating age confirmation or onboarding.
6. Open a product link such as `/product/product-1` before completing a reset first launch; after age, onboarding and guest entry, the intended product should open. In Settings, review onboarding again and verify that age status, cart and favorites stay intact.

Use VoiceOver to read the age choices, slide titles, page positions and guest button. Test on a small iPhone to confirm the bottom actions remain reachable. This self-declaration is not a legal or identity verification integration.

## Verification results

- `npm test -- --runInBand --silent`: **60 suites passed, 748 tests passed, 0 snapshots**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run export:web -- --max-workers 2`: passed and produced `dist` with 136 static routes.
- `git diff --check`: passed.
- Web smoke check in the Codex browser: 410×814; the age gate and Home screen have no horizontal overflow and the bottom actions remain reachable. The local headless Chrome process exited before producing the requested 320×568, 390×844, 430×932 and 1280×800 captures, so those four viewport checks remain a follow-up rather than a claimed result.

The native iPhone flow still needs to be exercised on the physical device with the steps above; this session verified the shared state, routing and UI behavior in Jest and the exported web build.
