# Beerland engineering rules

## Scope and architecture

- Build only the phase requested by the user. This is a production app foundation, not a disposable prototype.
- Keep routes thin, business logic in features/stores, and data access behind injected repositories and query hooks.
- UI must never import mock fixtures. Use RepositoryProvider to substitute implementations in tests.
- Visible text is Ukrainian. Code and documentation are English.
- Use theme tokens, safe areas and accessible interactions across iOS, Android and Web.

## Mandatory definition of done

A feature is complete only when implementation is finished, TypeScript and lint pass, relevant unit/component tests accompany the change, all tests pass, and mobile and web behavior are verified.
If a platform runtime is unavailable, report that verification gap explicitly; do not claim the feature is fully verified.

## Testing strategy

- Use Jest and React Native Testing Library, compatible with the installed Expo SDK.
- Test behavior, state, repositories, services, hooks, transformations, filters/search, cart calculations, favorites, selected store, loading/empty/error states and important user actions where implemented.
- Use isolated QueryClients and injected repositories. Reset mutable state between tests.
- Avoid snapshot-heavy tests and assertions about purely visual details.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, and `npm run export:web` before delivery.
- Add meaningful accessibility labels and testIDs for stable interactions. Do not configure a full E2E framework yet; preserve compatibility with future Maestro flows.

## Expo SDK documentation

Read the exact versioned SDK documentation at https://docs.expo.dev/versions/v57.0.0/ before making framework changes.
