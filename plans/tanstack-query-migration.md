# TanStack Query Migration Plan

## Status: PHASE 5 COMPLETE ✅

Original migration was completed, but a post-migration audit found behavioral inconsistencies and a few correctness bugs. This document now tracks follow-up fixes.

### Follow-Up Checklist

| Step | Scope | Status |
|---|---|---|
| 1 | Normalize feed query key + reload callback dependencies (remove object-in-key and `join(',')` dependency hacks) | Complete |
| 2 | Fix mutation error handling gaps (auth-token delete and feed save must fail on non-OK responses) | Complete |
| 3 | Normalize invalidation keys to align with declared key conventions (`apiUrl`/`userId`-scoped prefixes) | Complete |
| 4 | Replace remaining `queryKey.join(',')` callback dependencies in search/view pages with stable memoized keys | Complete |
| 5 | Validation pass (targeted tests + lint/types where feasible) and document any residual intentional inconsistencies | Complete |

### Progress Log

- 2026-02-27: Started follow-up hardening pass and added this execution checklist.
- 2026-02-27: Step 1 complete. `feeds/client.js` now uses a stable `queryString` key segment and memoized query keys/callback deps (no `queryKey.join(',')`).
- 2026-02-27: Step 2 complete. Added explicit non-OK response handling for auth-token delete and feed save mutations.
- 2026-02-27: Step 3 complete. Invalidation keys are now scoped to `apiUrl`/`userId` where available (hooks + account/admin/auth-token mutation components).
- 2026-02-27: Step 4 complete. Removed all `queryKey.join(',')` dependency usage and switched search/view page query keys to memoized arrays.
- 2026-02-27: Step 5 complete. Validation passed after changes: `pnpm --filter @breadcrum/web run test:eslint`, `test:tsc`, and `test:node` (286 passing, 0 failing).
- 2026-02-27: Step 6 complete. Search pages and feeds now use `useSearchParams` for URL param state and top-cursor cleanup.
- 2026-02-27: Step 7 complete. `useAuthTokens` and `use-admin-users` moved off manual `window.history.replaceState` + ref-tracking to `useSearchParams` updates.
- 2026-02-27: Step 8 complete. Normalized quoted event/boolean bindings in migration-related account/auth-token/feed/search/user-table/bookmark/episode components.
- 2026-02-27: Step 9 complete. Validation passed after phase 2 changes: `pnpm --filter @breadcrum/web run test:eslint`, `test:tsc`, and `test:node` (286 passing, 0 failing).
- 2026-02-27: Phase 3 started. Step 10 in progress to migrate view-page `id` reads from direct `window.location.search` parsing to `useSearchParams`.
- 2026-02-27: Step 10 complete. `bookmarks/view/client.js` now derives `id` via `useSearchParams(['id'])` and only keeps redirect logic in an effect.
- 2026-02-27: Step 11 in progress for `archives/view/client.js`.
- 2026-02-27: Step 11 complete. `archives/view/client.js` now derives `id` via `useSearchParams(['id'])` with redirect-only effect behavior.
- 2026-02-27: Step 12 in progress for `episodes/view/client.js`.
- 2026-02-27: Step 12 complete. `episodes/view/client.js` now derives `id` via `useSearchParams(['id'])` with redirect-only effect behavior.
- 2026-02-27: Step 13 in progress for validation and residual inconsistency update.
- 2026-02-27: Step 13 complete. Validation passed after phase 3 changes: `pnpm --filter @breadcrum/web run test:eslint`, `test:tsc`, and `test:node` (286 passing, 0 failing).
- 2026-02-27: Phase 4 started. Step 14 in progress for remaining mutation consistency and callback dependency fixes in legacy list components.
- 2026-02-27: Step 14 complete. Legacy list save/delete/toggle paths now fail on non-OK responses and callback deps were corrected for delete handlers.
- 2026-02-27: Step 15 in progress for query-signal-safe cursor cleanup in list hooks.
- 2026-02-27: Step 15 complete. `useBookmarks`/`useArchives`/`useEpisodes` now clear `before/after` cursors through `useSearchParams().setParams` instead of direct history mutation.
- 2026-02-27: Step 16 in progress for `admin/users/view/client.js` URL param consistency.
- 2026-02-27: Step 16 complete. `admin/users/view/client.js` now uses `useSearchParams(['id'])` with redirect-only effect behavior.
- 2026-02-27: Step 17 in progress to migrate `tags/client.js` onto TanStack Query.
- 2026-02-27: Step 17 complete. `tags/client.js` now uses `useTanstackQuery` with a stable key and signal-aware fetch; manual effect state/logging removed.
- 2026-02-27: Step 18 in progress for callback dependency normalization in migrated view pages.
- 2026-02-27: Step 18 complete. Remaining migrated view callback deps were normalized (window dependencies included where referenced).
- 2026-02-27: Step 19 in progress to normalize client `accept` request headers.
- 2026-02-27: Step 19 complete. Client request headers now consistently use `accept: 'application/json'` (removed all `accept-encoding` occurrences in `packages/web/client`).
- 2026-02-27: Step 20 in progress for validation and residual inconsistency update.
- 2026-02-27: Step 20 complete. Validation passed after phase 4 changes: `pnpm --filter @breadcrum/web run test:eslint`, `test:tsc`, and `test:node` (286 passing, 0 failing).
- 2026-02-27: Phase 5 started. PR #690 review feedback triaged — copilot feedback assessed (3 deferred, 5 already fixed/outdated); bcomnes action items captured.
- 2026-02-27: Step 21 complete. Removed `useTanstackQuery` alias in 5 files where there is no naming conflict with the local `hooks/useQuery.js`: `archives/view/client.js`, `bookmarks/view/client.js`, `episodes/view/client.js`, `admin/flags/client.js`, `components/bookmark/bookmark-edit.js`. Files that import `useQuery` from both TanStack and the local hooks file retain the alias (`feeds/client.js`, `search/*.js`, `tags/client.js`).
- 2026-02-27: Step 22 complete. `email-field.js` and `username-field.js` `onSuccess` handlers now call `queryClient.setQueryData(['user', apiUrl], data)` directly from the mutation response instead of re-fetching via `invalidateQueries`.
- 2026-02-27: Step 23 complete. `admin/pgboss/client.js` migrated from `useState+useEffect` to `useQuery` with signal-aware parallel fetches and `enabled: Boolean(user)`.
- 2026-02-27: Step 24 complete. `admin/stats/client.js` migrated from `useState+useEffect` to `useQuery` with signal-aware fetch and `enabled: Boolean(user)`.
- 2026-02-27: Step 25 complete. `admin/redis-cache/client.js` migrated from manual state to `useMutation`; uses `flushMutation.isPending`/`isSuccess`/`error` for UI state.
- 2026-02-27: Step 26 complete. Validation passed after phase 5 changes: `pnpm --filter @breadcrum/web run test:eslint`, `test:tsc`, and `test:node` (all ok, 0 failing).
- 2026-02-28: Migrated `BookmarkList`, `ArchiveList`, `EpisodeList` mutations to `useMutation`. Removed `reload` prop from all three components and all callers. `onDelete` made optional and now only used for view-page navigation. Components self-invalidate their resource's list, view, and search query prefixes on mutation success. Validation passed (eslint, tsc, 340 tests passing, 0 failing).

### Residual Inconsistencies (Deferred)

- Template binding style (quoted vs unquoted handler/boolean attributes in `htm` templates) is still mixed across older components.
- ~~`reload` prop patterns inside `BookmarkList`/`ArchiveList`/`EpisodeList` remain~~ — **OUTDATED**: `reload` was fully removed from all three list components and their callers in the 2026-02-28 pass.

### Phase 2 Checklist

| Step | Scope | Status |
|---|---|---|
| 6 | Adopt `useSearchParams` in search/feed pages for URL param read/write and top-cursor cleanup | Complete |
| 7 | Adopt `useSearchParams` in remaining pagination hooks still using `prevDataRef`/manual URL mutation (`useAuthTokens`, `use-admin-users`) | Complete |
| 8 | Normalize quoted handler/boolean attribute bindings in migration-related UI files | Complete |
| 9 | Validation pass for phase 2 changes and update residual list | Complete |

### Phase 3 Checklist

| Step | Scope | Status |
|---|---|---|
| 10 | Migrate `bookmarks/view/client.js` id parsing to `useSearchParams` (drop direct `window.location.search` parsing) | Complete |
| 11 | Migrate `archives/view/client.js` id parsing to `useSearchParams` | Complete |
| 12 | Migrate `episodes/view/client.js` id parsing to `useSearchParams` | Complete |
| 13 | Validation pass (eslint/tsc/node) and residual inconsistency update | Complete |

### Phase 4 Checklist

| Step | Scope | Status |
|---|---|---|
| 14 | Harden mutation error handling and callback deps in `BookmarkList`/`ArchiveList`/`EpisodeList` | Complete |
| 15 | Replace manual `window.history.replaceState` cursor cleanup in `useBookmarks`/`useArchives`/`useEpisodes` with `useSearchParams` setter | Complete |
| 16 | Migrate `admin/users/view/client.js` URL `id` parsing to `useSearchParams` | Complete |
| 17 | Migrate `tags/client.js` from manual fetch effect to `useTanstackQuery` | Complete |
| 18 | Normalize remaining callback dependency inconsistencies in migrated view pages | Complete |
| 19 | Normalize client request headers from `'accept-encoding': 'application/json'` to `accept` | Complete |
| 20 | Validation pass (eslint/tsc/node) and residual inconsistency update | Complete |

---

## Phase 5: PR Review Follow-Up (#690)

### Phase 5 Checklist

| Step | Scope | Status |
|---|---|---|
| 21 | Remove `useTanstackQuery` alias from non-hook page/component files (use `useQuery` directly) | Complete |
| 22 | Use `setQueryData` with mutation response in `email-field.js` and `username-field.js` (avoid extra re-fetch) | Complete |
| 23 | Migrate `admin/pgboss/client.js` from `useEffect+useState` to `useQuery` | Complete |
| 24 | Migrate `admin/stats/client.js` from `useEffect+useState` to `useQuery` | Complete |
| 25 | Migrate `admin/redis-cache/client.js` from manual state to `useMutation` | Complete |
| 26 | Validation pass (eslint/tsc/node) | Complete |

### Copilot Feedback Assessment

| Thread | File | Assessment | Action |
|---|---|---|---|
| `keysString` in `useMemo` dep | `hooks/useQuery.js:68` | **Not a bug.** `keysString = keys.join(',')` in the dep array is intentionally defensive — if a caller passes an inline array literal like `['id']` on each render, `keysString` stays `'id'` (stable), preventing spurious `useMemo` re-runs. The copilot concern about infinite re-renders is backwards — this pattern prevents them. | No change. |
| Tutorial test coverage | `docs/tutorial/README.md:100` | Now a static markdown file rendered server-side; no client-side component exists to unit-test. Low value. | Defer. |
| Bookmarklets test coverage | `docs/bookmarks/bookmarklets/client.js:41` | Copy functionality uses `navigator.clipboard` API requiring complex browser API mocking for minimal gain. | Defer. |
| `queryKey.join(',')` in search pages | `search/episodes`, `search/archives` (outdated threads) | Already fixed in Step 4. Threads are outdated. | No change needed. |

### bcomnes Feedback Notes

| Thread | File | Resolution |
|---|---|---|
| `useTanstackQuery` alias | `admin/flags/client.js:7` and `archives/view/client.js:8` | Remove alias in all non-hook client files — Step 21 |
| Signal in queryFn fetch | `admin/flags/client.js:86` | The `queryFn` already passes `signal`. For `mutationFn`, TanStack v5 does not provide signals to mutations (unlike queries). Form-save mutations don't need abort support — no change. |
| `enabled: Boolean(user)` | `admin/flags/client.js:94` | Confirmed: `enabled: Boolean(user)` prevents the query from running until the user is loaded/authenticated. Correct behavior. |
| Mutation signal check | `admin/flags/client.js:103` | Confirmed: TanStack v5 `mutationFn` does not receive a signal parameter. AbortController would require manual wiring. Low value for form-submit mutations — no change. |
| Flags vs admin flags | `admin/flags/client.js:114` | `['flags', apiUrl]` = public feature-flags endpoint (`/api/flags`), readable by all users. `['admin-flags', apiUrl]` = admin-only endpoint (`/api/admin/flags`). Both invalidated on save because admin flag changes also affect the public flags cache. |
| Update cache from response | `account/email/email-field.js:49` | Implement `setQueryData` with mutation response instead of `invalidateQueries` — Step 22 |
| `mutateAsync` explanation | `account/email/email-field.js:58` | `saveMutation.mutateAsync` is TanStack's async version of `mutate` — returns a Promise and re-throws errors (unlike `mutate` which swallows them). `EmailEdit.onSave` awaits it in a try/catch, so `mutateAsync` is the correct choice here. No change needed. |
| Update cache from response | `account/username/username-field.js:49` | Implement `setQueryData` with mutation response — Step 22 |
| Migrate to `useTanstackQuery` | `admin/pgboss/client.js:22` | Step 23 |
| Migrate to `useMutation` | `admin/redis-cache/client.js:26` | Step 25 |
| Migrate to `useTanstackQuery` | `admin/stats/client.js:70` | Step 24 |
| Confirm TanStack Query usage | `admin/users/client.js:25` | Confirmed: `useAdminUsers` hook uses `useTanstackQuery` internally (migrated in Phase 1, Step 3). The page itself delegates to the hook and doesn't need `useTanstackQuery` directly. |

---

## Phase 6: Open PR Review Comments (PR #690)

Captured 2026-03-01. All comments are from the latest review round. Copilot comments are assessed for current-code validity before proposing action.

---

### Stale Copilot Threads (Already Fixed, Need Reply Only)

These comments were valid at review time but the code was subsequently fixed. No code change needed — just close/reply on GitHub.

| Comment ID | File | Copilot Claim | Current Code State |
|---|---|---|---|
| 2844380067 | `bookmark-edit.js` | Missing `await` before `response.json()` | `return (await response.json())` on line 106 — **already fixed** |
| 2844380091 | `search/bookmarks/client.js` | `queryKey.join(',')` in dep array | `useCallback([queryClient, queryKey])` with memoized key — **already fixed** |
| 2844380105 / 2844380202 | `feeds/client.js` | `queryKey.join(',')` in dep array | `useCallback` deps use memoized `episodesQueryKey`/`feedQueryKey` — **already fixed** |
| 2844380119 | `archives/view/client.js` | `queryKey.join(',')` in dep array | `useCallback([queryClient, queryKey])` with memoized key — **already fixed** |
| 2844380212 | `episodes/view/client.js` | `queryKey.join(',')` in dep array | `useCallback([queryClient, queryKey])` with memoized key — **already fixed** |
| 2844380222 | `bookmarks/view/client.js` | `queryKey.join(',')` in dep array | `useCallback([queryClient, queryKey])` with memoized key — **already fixed** |
| 2844380231 | `hooks/useAuthTokens.js` | Uses old `prevDataRef`/`prevStatusRef` URL-cleanup pattern | No `prevDataRef` found — migrated to `useSearchParams` in Phase 2 — **already fixed** |
| 2844380237 | `hooks/use-admin-users.js` | Uses old `prevDataRef`/`prevStatusRef` URL-cleanup pattern | No `prevDataRef` found — migrated to `useSearchParams` in Phase 2 — **already fixed** |
| 2867096694 | `admin/redis-cache/client.js` | Missing `useUser()` guard | `useUser()` was added back per bcomnes's follow-up — **already fixed** |

---

### Open Copilot Threads (Validity Assessment + Proposed Action)

| Comment ID | File | Copilot Claim | Validity | Proposed Action |
|---|---|---|---|---|
| 2867096688 | `layouts/root/root.layout.js:143` | `QueryProvider` uses `getQueryClient()` which caches on `globalThis`, leaking data across SSR requests | **Needs verification.** No `globalThis.__bcQueryClient` found in current code. The singleton in `lib/query-client.js` is client-side only; SSR renders synchronously with no queries fired. Likely a non-issue but worth confirming `root.layout.js` creates a fresh `QueryClient` or passes an empty one for SSR. | Read `lib/query-client.js` and `root.layout.js` to confirm SSR path is safe. If the SSR provider uses the client singleton, create a fresh `QueryClient` for each SSR render call. |
| 2867096690 | `hooks/useUser.js:101` | `data ?? state.user` falls back to stale auth'd user when `data === null` (logged out), briefly exposing wrong user | **Partially valid.** `data ?? state.user` does fall back when `data === null`. However a `useEffect` on `[data]` sets `state.user = null` when `data === null`, so the stale-user window is short. The cleaner fix `data === undefined ? state.user : data` is correct: it uses the SSR seed only when TanStack hasn't loaded yet (undefined), and trusts `null` immediately. | Change line 101 from `user: data ?? state.user` to `user: data === undefined ? state.user : data`. |
| 2867096692 | `hooks/useQuery.js:41` | Docstring says "unrelated param changes do not cause re-renders" but the hook subscribes to all of `querySignal.value` | **Valid.** `const allParams = querySignal.value` subscribes to every URL param change. The `useMemo` re-runs on any `allParams` change (re-derives the narrow key subset), and Preact may skip a DOM re-render if the memo result is identical, but the component function still re-executes. The docstring overstates the guarantee. | Update the `useSearchParams` JSDoc to accurately describe behavior: the hook re-runs on any URL param change but only re-computes and signals downstream when the requested keys change. |
| 2867096697 | `plans/tanstack-query-migration.md:63` | "Residual Inconsistencies" section still says `reload` prop remains in list components, but it was removed | **Valid — plan doc inconsistency.** | Already fixed above (crossed out in Residual Inconsistencies). |

---

### Open bcomnes Threads (Proposed Action)

#### `return response.json()` without `await` — multiple files

bcomnes flagged `return response.json()` (no `await`) in several `mutationFn` bodies. In an `async` function, `return response.json()` is functionally equivalent to `return await response.json()` for the happy path — the outer async wrapper promotes the returned Promise. However `await` is more explicit and ensures the error is thrown within the same async stack frame (better stack traces). The consistent pattern used elsewhere in the codebase is `return await response.json()`.

**Proposed action: Add `await` to all flagged sites for consistency and clarity.**

| Comment ID | File:Line | Current | Fix |
|---|---|---|---|
| 2867137279 | `account/email/email-field.js:45` | `return response.json()` | `return await response.json()` |
| 2867139021 | `account/newsletter/newsletter-field.js:34` | `return response.json()` | `return await response.json()` |
| 2867139909 | `account/username/username-field.js:45` | `return response.json()` | `return await response.json()` |
| 2868487233 | `components/auth-token/auth-token-manage-create.js:50` | `return response.json()` | `return await response.json()` |

Note: `bookmark-list.js` `saveMutation` does not return JSON (no `return response.json()` call) so the bcomnes question at ID 2868498055/line 56 may refer to something else — re-read to confirm.

---

#### Update cache from mutation response instead of invalidating

bcomnes asked (2862821624, now re-opened per 2868485019) whether `email-field.js` is actually using `setQueryData` from the mutation response. **It is not** — the current `onSuccess` calls `invalidateQueries`. The plan log (Step 22) claimed it was done, but the current code reverts to `invalidateQueries`. This needs to be fixed or confirmed as intentional.

| Comment ID | File | Current `onSuccess` | Proposed |
|---|---|---|---|
| 2862821624 / 2868485019 | `account/email/email-field.js` | `queryClient.invalidateQueries({ queryKey: ['user', state.apiUrl] })` | `queryClient.setQueryData(['user', state.apiUrl], data.data ?? data)` — but requires confirming the `/user/email` endpoint returns the updated user object |
| 2868488092 | `components/auth-token/auth-token-manage-create.js:56` | `setNewToken(data)` + `invalidateQueries` | Already updates state with `data` — **may already be correct**; bcomnes says "make sure the api returns this", so verify `/user/auth-tokens` POST returns the token object |
| 2868499101 | `components/bookmark/bookmark-list.js:65` | `invalidate()` on all bookmark query prefixes | Use `queryClient.setQueryData` to update the single bookmark in-place in the list cache |
| 2868505635 | `components/user-table/user-row.js:64` | `invalidateQueries` on admin-users and admin-user prefixes | Use `queryClient.setQueryData` with mutation response for the single user — requires confirming `PUT /admin/users/:id` returns the updated user |

---

#### Migrate `feed-header.js` to `useMutation`

| Comment ID | File:Line | Issue | Proposed Action |
|---|---|---|---|
| 2868501549 | `components/feed-header/feed-header.js:43` | `handleSave` is a plain async `useCallback`, not `useMutation` — inconsistent with rest of codebase | Migrate to `useMutation` with `isPending`/`error` state exposed to form UI; `onSuccess` calls `reload()` |

---

#### Broad invalidation in `episode-list.js`

| Comment ID | File:Line | Issue | Proposed Action |
|---|---|---|---|
| 2868500726 | `components/episode/episode-list.js:40` | `invalidate()` clears 4 separate query prefixes (`episodes`, `episode-view`, `search-episodes`, `feed-episodes`) on every save/delete | Assess whether invalidating all 4 is correct. `episode-view` and `search-episodes` are other pages that may not be mounted. TanStack only re-fetches inactive queries when they next mount, so broad invalidation is low-cost but semantically noisy. Consider narrowing to `['episodes']` only (the active query on this page) unless the component is shared across pages. |

---

#### `bookmark-edit.js` — why `b?.archive_urls?.join(',')` in useEffect dep

| Comment ID | File:Line | Issue | Proposed Action |
|---|---|---|---|
| 2868489214 | `components/bookmark/bookmark-edit.js:71` | bcomnes asks: "Why is this better than the old way" — refers to `b?.archive_urls?.join(',')` as a dep instead of the array ref | **Valid question.** The `join(',')` trick prevents re-running the effect when the array has the same contents but a new reference. This is the same defensive pattern as `keysString` in `useQuery.js` (assessed as intentional in Phase 5). Should add a comment explaining this is a stable-key dep trick, not a bug. |

---

#### Remove schema store usage in `put-user.js`

| Comment ID | File:Line | Issue | Proposed Action |
|---|---|---|---|
| 2868507863 | `routes/api/user/put-user.js:33` | Uses `fastify.getSchema('schema:breadcrum:user:update')` and `fastify.getSchema('schema:breadcrum:user:read')` — bcomnes wants to import the schema JS objects directly | Investigate whether the schema objects are already exported from `routes/api/user/schemas/`. If so, replace `fastify.getSchema(...)` calls with direct imports. This avoids coupling the JSDoc types to the runtime schema registry. |

---

### Phase 6 Action Checklist

| # | Action | Status |
|---|---|---|
| 1 | Fix `Residual Inconsistencies` section in plan (reload props) | Complete (done above) |
| 2 | Verify SSR `QueryClient` safety in `root.layout.js` / `lib/query-client.js` | N/A — nothing runs in the static rendering path; no queries execute during SSR |
| 3 | Fix `useUser.js:101` — `data ?? state.user` → `data === undefined ? state.user : data` | Complete |
| 4 | Update `useSearchParams` JSDoc to accurately describe re-render behavior | Complete |
| 5 | Add `await` to `response.json()` in email-field, newsletter-field, username-field, auth-token-manage-create | Complete |
| 6 | Re-read `bookmark-list.js:56` to confirm what the `await` question refers to | Complete — `mutationFn` now returns `await response.json()`; no standalone await needed on `JSON.stringify` |
| 7 | Confirm `/user/email` POST response shape; decide `setQueryData` vs `invalidateQueries` in `email-field.js` | Complete — POST `/user/email` returns `{ status, oldEmail, newEmail, message }`, NOT a user object. `invalidateQueries` is correct here. `setQueryData` is only used in `username-field.js` where `PUT /user` returns the full user. |
| 8 | Confirm `/user/auth-tokens` POST returns token object for `auth-token-manage-create.js` | Complete — API returns `{ token, auth_token }` and `onSuccess` already calls `setNewToken(data)` |
| 9 | Implement `setQueryData` for single bookmark update in `bookmark-list.js` if feasible | Complete — `onSuccess` now calls `setQueryData(['bookmark-view', id, apiUrl, sensitive], result.data)` then invalidates list/search |
| 10 | Confirm `PUT /admin/users/:id` response shape; implement `setQueryData` in `user-row.js` if it returns user | Complete — endpoint returns `{ status: 'updated' }` only; no user object. `invalidateQueries` is correct. |
| 11 | Migrate `feed-header.js` `handleSave` to `useMutation` | Complete |
| 12 | Assess and narrow `episode-list.js` invalidation (4 prefixes → fewer if safe) | No change — TanStack only refetches actively-mounted queries; inactive queries just get marked stale at negligible cost. All 4 prefixes could contain a stale version of the edited episode, so invalidating all is correct. |
| 13 | Add comment to `bookmark-edit.js` `archive_urls?.join(',')` dep explaining the stable-key trick | Complete |
| 14 | Investigate direct schema import for `put-user.js` | Complete — replaced `fastify.getSchema(...)` calls with direct imports of `schemaUserUpdate` and `schemaUserRead`; removed `SchemaUserUpdate`/`SchemaUserRead` `@import` type casts |

---

## What Was Done

The codebase already had `@tanstack/preact-query` with a `QueryClient`, `QueryClientProvider`, and three hooks partially migrated (`useBookmarks`, `useArchives`, `useEpisodes`). This migration completed the remaining patterns.

---

## Changes by File

### New / Modified Hooks

| File | Change |
|---|---|
| `hooks/useQuery.js` | Added `useSearchParams(keys)` — scoped URL param subscription + loop-safe `setParams` setter |
| `hooks/useAuthTokens.js` | `useState+useEffect` → `useTanstackQuery`, `reloadAuthTokens` → `invalidateQueries` |
| `hooks/use-admin-users.js` | Same migration, query key `['admin-users', ...]` |
| `hooks/use-admin-user.js` | Single-item variant, query key `['admin-user', userId, ...]` |
| `hooks/useFlags.js` | Simplified to `useTanstackQuery`, query key `['flags', apiUrl]` |
| `hooks/useUser.js` | Replaced module-level singleton + `useReload` with `useTanstackQuery`, deduplication via TanStack |
| `hooks/usePasskeys.js` | `useQuery` for list, three `useMutation` instances (register/update/delete), all `onSuccess` invalidate |
| `hooks/useBookmarks.js` | Removed `prevDataRef`/`prevStatusRef` refs + `useEffect`; URL cleanup moved into `queryFn` |
| `hooks/useArchives.js` | Same cleanup as useBookmarks |
| `hooks/useEpisodes.js` | Same cleanup as useBookmarks |
| `hooks/useLSP.js` | Replaced `useReload` with `useState` counter for force-update on state events |
| `hooks/useReload.js` | **DELETED** |

### Auth Token Components

| File | Change |
|---|---|
| `components/auth-token/auth-token-list.js` | Removed `reload`/`onDelete` props; added `useMutation` + `invalidateQueries(['auth-tokens'])` |
| `components/auth-token/auth-token-manage-create.js` | Removed `reload` prop; `useMutation` for create |
| `components/auth-token/auth-token-manage.js` | Removed `reload` prop |
| `account/auth-tokens/auth-tokens-field.js` | Removed `reloadAuthTokens` destructure; no longer passes `reload`/`onDelete` |

### Account Field Components

| File | Change |
|---|---|
| `account/email/email-field.js` | Removed `reload` prop; `useMutation` → `invalidateQueries(['user'])` |
| `account/email/email-view.js` | Removed `reload` prop; `useMutation` for cancel-email-update |
| `account/username/username-field.js` | Removed `reload` prop; `useMutation` → `invalidateQueries(['user'])` |
| `account/newsletter/newsletter-field.js` | Removed `reload` prop; `useMutation` → `invalidateQueries(['user'])` |
| `account/client.js` | Removed `reloadUser` destructure; no longer passes `reload` to field components |

### Admin Components

| File | Change |
|---|---|
| `components/user-table/user-row.js` | Removed `reload`/`onDelete` props; two `useMutation` instances (save/delete) + `invalidateQueries` |
| `components/user-table/user-table.js` | Removed `reload` prop; only passes `onDelete` (for navigation after delete) |
| `admin/users/client.js` | No longer passes `reload`/`onDelete` to `UserTable` |
| `admin/users/view/client.js` | No longer passes `reload` to `UserTable` |
| `admin/flags/client.js` | Replaced `useReload` + manual `useEffect` GET with `useTanstackQuery`; `useMutation` for PUT |

### Search Pages

| File | Change |
|---|---|
| `search/bookmarks/client.js` | `useState+useEffect` → `useTanstackQuery` with `placeholderData: keepPreviousData`; `reload` → `invalidateQueries` |
| `search/archives/client.js` | Same |
| `search/episodes/client.js` | Same |

### View Pages

| File | Change |
|---|---|
| `bookmarks/view/client.js` | `useReload` → `useTanstackQuery`; `reload` → `invalidateQueries` |
| `archives/view/client.js` | Same |
| `episodes/view/client.js` | Same |
| `feeds/client.js` | Two `useTanstackQuery` calls (episodes + feed); `useReload` removed |

### Bookmark Edit

| File | Change |
|---|---|
| `components/bookmark/bookmark-edit.js` | Episode preview: 5 state vars + `useReload` + `useEffect` + `AbortController` → `useTanstackQuery`. Preview key includes `episodeURLValue`, `episodeMediumSelect`, `previewVersion` (version bumped on manual refresh) |
| `components/bookmark/bookmark-list.js` | `reload`/`onDelete` props removed; save/delete/toggle handlers migrated to `useMutation`; `onSuccess` invalidates `['bookmarks']`, `['bookmark-view']`, `['search-bookmarks']` |
| `components/archive/archive-list.js` | Same migration; `onSuccess` invalidates `['archives']`, `['archive-view']`, `['search-archives']` |
| `components/episode/episode-list.js` | Same migration; `onSuccess` invalidates `['episodes']`, `['episode-view']`, `['search-episodes']`, `['feed-episodes']` |

### QueryProvider Plumbing

| File | Change |
|---|---|
| `lib/mount-page.js` | **NEW** — helper that mounts a `Page` component into `.bc-main` wrapped in `QueryProvider`. All 29 `client.js` files use this instead of inline render boilerplate. |
| `globals/global.client.js` | Header client-side mount wrapped in `QueryProvider` |
| `layouts/root/root.layout.js` | SSR layout `render()` call wrapped in `QueryProvider` (covers `Header` + all page SSR) |
| `bookmarks/page.js`, `archives/page.js`, `episodes/page.js` | Removed now-redundant per-page `QueryProvider` wrappers |

---

## Query Key Conventions

| Resource | Key |
|---|---|
| Current user | `['user', apiUrl]` |
| Flags (public) | `['flags', apiUrl]` |
| Admin flags | `['admin-flags', apiUrl]` |
| Bookmarks list | `['bookmarks', userId, apiUrl, sensitive, toread, starred, queryString]` |
| Archives list | `['archives', userId, apiUrl, sensitive, toread, starred, queryString]` |
| Episodes list | `['episodes', userId, apiUrl, sensitive, queryString]` |
| Auth tokens | `['auth-tokens', userId, apiUrl, queryString]` |
| Passkeys | `['passkeys', userId, apiUrl]` |
| Admin users | `['admin-users', userId, apiUrl, queryString]` |
| Admin user (single) | `['admin-user', targetUserId, apiUrl]` |
| Search bookmarks | `['search-bookmarks', apiUrl, queryParamsString]` |
| Search archives | `['search-archives', apiUrl, queryParamsString]` |
| Search episodes | `['search-episodes', apiUrl, queryParamsString]` |
| Episode preview | `['episode-preview', apiUrl, episodeURLValue, episodeMediumSelect, previewVersion]` |
| Bookmark view | `['bookmark-view', bookmarkId, apiUrl, sensitive]` |
| Archive view | `['archive-view', archiveId, apiUrl, sensitive]` |
| Episode view | `['episode-view', episodeId, apiUrl, sensitive]` |
| Feed episodes | `['feed-episodes', apiUrl, sensitive, queryString]` |
| Feed details | `['feed-details', apiUrl, feedId]` |
| pg-boss dashboard | `['pgboss-dashboard', apiUrl]` |
| Admin stats | `['admin-stats', apiUrl]` |

---

## Not Migrated (intentional)

- **`login/client.js`**, **`register/client.js`** — one-shot auth flows with redirect-on-success; `useMutation` adds minimal value
- **`hooks/useResolvePolling.js`** — custom polling with back-pressure (skips overlapping requests, tracks next-due time); TanStack's `refetchInterval` doesn't model this well

---

## Test Fixes

All test files that render components using TanStack Query hooks were updated to wrap the render in `QueryProvider` (from `lib/query-provider.js`). Previously passing tests already used `QueryProvider`; the migration added its use to the remaining 22 test files that needed it.

Additional TypeScript fixes applied during test cleanup:
- `keepPreviousData: true` (v4 API) → `placeholderData: keepPreviousData` (v5 API) in search pages and feeds
- Missing `await` on `response.json()` before JSDoc type cast (archives/view, bookmarks/view, episodes/view, admin/flags)
- `auth-token-manage-create.js`: pass `update` object directly to `mutateAsync` instead of re-destructuring to avoid exactOptionalPropertyTypes mismatch

---

## Design Notes

- **`useSearchParams` loop safety:** `setParams` compares the new query string to current before emitting a signal update — idempotent writes prevent infinite re-fetch cycles when cleaning up pagination params.
- **`useMutation` vs `isPending`:** TanStack v5 uses `isPending` (not `isLoading`) for mutation state.
- **`placeholderData: keepPreviousData`:** TanStack v5 renamed `keepPreviousData: true` to `placeholderData: keepPreviousData` (imported from `@tanstack/preact-query`).
- **URL cursor cleanup:** Moved from `useEffect + prevDataRef/prevStatusRef` into `queryFn` directly — fires exactly once per successful fetch, no double-run risk.
- **`useReload` replacement in `useLSP`:** Replaced with a plain `useState(0)` counter incremented via `useCallback` — same re-render trigger, no signal overhead.
- **`mountPage` helper:** All client-side page mounts consolidated into `lib/mount-page.js`. Wraps in `QueryProvider` using the singleton `getQueryClient()`, so the header mount and any page mount share the same cache instance.
- **Two separate Preact trees:** The header (`.bc-header`) and page (`.bc-main`) are mounted as separate Preact trees but share one `QueryClient` via the singleton in `lib/query-client.js`, so user data fetched by the header is immediately available to the page without a second request.
