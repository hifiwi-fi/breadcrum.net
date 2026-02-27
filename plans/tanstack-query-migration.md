# TanStack Query Migration Plan

## Status: PHASE 4 COMPLETE ✅

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

### Residual Inconsistencies (Deferred)

- Template binding style (quoted vs unquoted handler/boolean attributes in `htm` templates) is still mixed across older components.
- `reload` prop patterns inside `BookmarkList`/`ArchiveList`/`EpisodeList` remain (already documented as intentionally not migrated in this plan).

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

---

## Not Migrated (intentional)

- **`login/client.js`**, **`register/client.js`** — one-shot auth flows with redirect-on-success; `useMutation` adds minimal value
- **`hooks/useResolvePolling.js`** — custom polling with back-pressure (skips overlapping requests, tracks next-due time); TanStack's `refetchInterval` doesn't model this well
- **Mutations in `BookmarkList`, `ArchiveList`, `EpisodeList`** — these components still use manual fetch + `reload()`/`onDelete()` props internally; callers pass `invalidateQueries` wrappers as `reload`. A future step could migrate these too.

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
