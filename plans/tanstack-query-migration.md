# TanStack Query Migration Plan

## Status: COMPLETE ✅

All steps implemented. `useReload.js` has been deleted. All tests pass (288 node tests, ESLint clean, TypeScript clean).

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
| Feed episodes | `['feed-episodes', apiUrl, sensitive, query]` |
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
