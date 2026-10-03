# Persistence and ownership

Persistence is local demo storage through AsyncStorage (browser storage on Web). Records can include entered names, phones, addresses and order contact data. They are not encrypted or a production authorization boundary. OTP values and real access tokens are never persisted.

## Key inventory

Zustand records below use `{ state, version: 1 }` through `src/stores/persistence.ts` and validate their selected state with Zod.

| Key                                 | Persisted contents                                                       | Ownership                                                        |
| ----------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `beerland:cart`                     | Product/variant/store IDs and quantities; no authoritative prices/totals | Active guest/account workspace                                   |
| `beerland:favorites`                | Product IDs                                                              | Active workspace                                                 |
| `beerland:selected-store`           | Selected store ID                                                        | Active workspace                                                 |
| `beerland:fulfillment`              | Pickup/delivery choice                                                   | Active workspace                                                 |
| `beerland:addresses`                | Address book and selected ID; validated legacy records default to seeded | Active workspace                                                 |
| `beerland:checkout-draft`           | Contact, comment, payment choice, payload signature/idempotency attempt  | Active workspace; submission/age checkbox state is not persisted |
| `beerland:discovery`                | Up to six normalized recent searches, grid/list preference               | Device-level preference                                          |
| `beerland:notification-preferences` | Promotions/order/loyalty toggles                                         | Device-level preference; no push token/permission                |
| `beerland:store-discovery`          | Map/list choice                                                          | Device-level preference                                          |

Other records use explicit version-1 keys or versioned content schemas:

| Key                                                | Contents and ownership                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `beerland:first-launch:v1`                         | `version: 1`, age status, onboarding completion and guest entry; device-level          |
| `beerland:local-profile:v1`                        | Local guest demo profile, including entered contact fields                             |
| `beerland:mock-orders:v1`                          | Validated local mock receipts; ownership is applied separately                         |
| `beerland:demo-order-owners:v1`                    | Owner/request-ID ledger for local orders, initialized before the first account handoff |
| `beerland:demo-auth-challenge:v1`                  | Phone/challenge ID, timestamps, attempt/resend metadata; never the OTP                 |
| `beerland:demo-auth-account:v1:<normalized-phone>` | Local demo account profile                                                             |
| `beerland:demo-auth-session:v1`                    | Phone and 30-day expiry; a demo session record, not a secure token                     |
| `beerland:demo-workspace-owner:v1`                 | Active guest/account owner marker                                                      |
| `beerland:demo-workspace-guest:v1`                 | Guest snapshot: cart, favorites, addresses, store, fulfillment, checkout draft         |
| `beerland:demo-workspace-account:v1:<account-id>`  | Account workspace plus the last guest snapshot used for merge deduplication            |

`useSessionStore`, auth busy state, route/modal state, quantity-control pending values and QueryClient data are memory-only. Account keys contain demo identifiers/phones and must not be copied to logs or monitoring.

## Hydration and recovery

Static rendering never reads storage. The existing `useHydrateStores` lifecycle hydrates after mount, restores first launch and session, recovers the correct workspace, and then permits content. It blocks on failed persisted-store reads and offers retry. Late results from obsolete restore attempts cannot publish an old identity. This extends the existing startup lifecycle rather than adding a second state machine.

For generic Zustand records, malformed JSON, invalid schema or an unsupported version is copied to `<original-key>:recovery:v1` if no backup exists. Hydration uses safe defaults; the original is not immediately erased. A later valid write can replace the primary record, while the first recovery copy remains. If backing up/reading fails, startup stays recoverable instead of silently entering a partially hydrated workspace. This is preservation for diagnosis, not a UI data-repair/import tool.

Custom auth/order/workspace records use their existing schema/recovery paths, not the generic backup wrapper. Missing ownership metadata after an account workspace exists fails closed; it does not reinterpret all private receipts as guest orders. A corrupted/missing guest snapshot can require recovery rather than exposing an account's active state. There is no global “erase all storage” recovery action.

## Existing migrations and compatibility

- Version-1 Zustand records remain compatible; no version bump or blanket deletion was made in Phase 10. Future schema versions need explicit migrations and migration tests.
- Old cart rows with no explicit variant retain their default variant semantics; cart calculations revalidate against current repository offers.
- Existing address books, including intentionally empty books, are treated as seeded and are not populated again with demo addresses.
- Legacy first-launch usage can skip the introduction, but **never proves adulthood**. Age confirmation still precedes protected content. Malformed/read-failed first-launch data cannot grant adult access.
- Legacy account workspace records are read as the previous workspace shape and become `{ workspace, lastGuest }` on a valid later write. Missing checkout fields use an empty draft.
- Legacy guest orders without a ledger remain supported only before any account handoff. Ledger initialization precedes creation of the guest handoff snapshot. Once account separation exists, missing/corrupt ownership cannot disclose orders.

No documented key was found to be safely obsolete. The removed `restoreDemoWorkspace` helper had no callers; removing it did not remove persisted data. The first-launch reset remains an explicitly guarded development utility and touches only its first-launch record.

## Account transitions

The active workspace is saved separately from the guest snapshot. Sign-in merges only new guest cart quantities, deduplicates favorites/addresses and preserves variant/store identity. Conflicting carts require an explicit decision through the existing transfer validation. The account record retains the last merged guest snapshot so signing in twice does not double quantities.

Logout saves the account workspace, restores the guest workspace and isolates private query/form state. Owner-scoped query keys and before/after-await checks stop late reads from returning account A data in account B. Phone authentication never changes age status. Notification/search/map preferences and age state are device-level.

These are separate local key writes, **not an atomic encrypted transaction**. Force-close during a handoff, storage quota failures and migration from local demo data to real accounts require device testing and an approved future server synchronization policy. Production authorization and credential security must be enforced by real services.
