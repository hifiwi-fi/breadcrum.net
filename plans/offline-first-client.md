# Offline-first Breadcrum client plan

## Status snapshot

- Created: 2026-06-02
- Status: in-progress hidden experiment
- Current client shape:
  - Static Preact/HTM client pages live under `packages/web/client`.
  - `packages/web/client/lib/query-client.js` creates a shared `QueryClient` with `retry: 0` and `refetchOnWindowFocus: false`.
  - `packages/web/client/lib/query-provider.js` wraps pages and the global header in `QueryClientProvider`.
  - `packages/web/client/globals/global.client.js` registers `/service-worker.js`.
  - `packages/web/client/service-worker.template.js` emits a manifest and a service worker that only logs `install`.
  - `packages/web/client/layouts/root/root.layout.js` links `/manifest.webmanifest`.
  - `packages/web/client/hooks/state.js` persists user, API URL, filters, and flags through `local-storage-proxy`.
  - Hidden `/api/delta/last_update` and `/api/delta/bookmarks` endpoints now provide read-only bookmark snapshot data.
  - Hidden `offline_db_spike=true` mode uses TanStack DB collections for bookmark snapshots and feed details, covering bookmark list/detail/search, derived tags, derived archive/episode list/detail/search, and the feeds page while offline.
  - Browser SQLite persistence is wired for the hidden bookmark collection when OPFS/worker prerequisites are available before page mount.
  - Service worker app-shell caching and logout/user-switch runtime cleanup are partially implemented.

Implementation progress:

- Added TanStack DB adapter dependencies and Preact compat alias.
- Added `@tanstack/browser-db-sqlite-persistence` and `@journeyapps/wa-sqlite` for the OPFS/SQLite persistence experiment.
- Added user/API-scoped offline namespace helpers, optional OPFS persistence open/delete helpers, and logout cleanup.
- Added a hidden bookmarks collection backed by `/api/delta/bookmarks`, with optional persisted collection wrapping.
- Added offline bookmark list, bookmark detail, bookmark search, derived tag, archive list/detail/search, episode list/detail/search, and feed page read models behind `offline_db_spike=true`.
- Added hidden `/api/delta/feeds` feed snapshot support and a persisted feeds collection for offline feed headers.
- Added online/offline state handling so bookmark, archive, episode, feed, account, passkey, and auth-token writes are temporarily disabled while offline until the queued-write outbox is implemented; resolve polling pauses while offline.
- Folded bookmark, archive, and episode list offline reads into the existing `useBookmarks()`, `useArchives()`, and `useEpisodes()` hooks so those pages no longer choose between parallel network/offline hooks.
- Added service worker install/activate/fetch caching for same-origin app shell assets while bypassing `/api/*`.
- Remaining major phase 1 gaps: browser manual validation, feed/detail/search hook consolidation, and queued-write outbox work.

## Implementation choices

- Use service worker CacheStorage for the static PWA shell.
- Use TanStack DB collections for durable private user data.
- Use `@tanstack/query-db-collection` with the existing `QueryClient` for online collection fetches.
- Use `@tanstack/react-db` through `react: npm:@preact/compat@^18.3.1` for the first Preact adapter spike.
- Use `@tanstack/browser-db-sqlite-persistence` for browser collection persistence.
- Use `@tanstack/offline-transactions` for queued phase 2 writes.
- Add `@tanstack/query-core` explicitly because `@tanstack/query-db-collection` depends on it as a peer, even though `@tanstack/preact-query` already depends on it internally.
- Add `@journeyapps/wa-sqlite` when enabling browser SQLite persistence because `@tanstack/browser-db-sqlite-persistence` requires it as a peer.

## Pre-implementation notes

- `@tanstack/query-db-collection` query functions must return the complete collection state. Keep `/api/delta/*` collection fetches as full snapshots for now.
- Browser SQLite persistence is an OPFS/wa-sqlite compatibility bet. The package uses a dedicated Web Worker, OPFS sync access handles in the worker, and single-tab semantics by default. Validate it in Safari, Chromium, and installed PWA mode before making it the only persistence path.
- Treat offline data as best-effort cached state. Online revalidation is the source of truth for server deletes, server mutations, tag membership changes, generated archive/episode updates, and feed changes.
- Do not add tombstones, revision tables, trigger logs, or join-table invalidation in the first pass. If full snapshots become too expensive, add incremental sync later as an explicit optimization.
- Keep page components on the existing domain hooks (`useBookmarks()`, `useArchives()`, `useEpisodes()`, `useFeeds()`, detail hooks, and search hooks). Those hooks should become local-first internally instead of pages choosing between parallel `useOffline*` and network hooks.
- Phase 2 should start narrower than the full mutation list. Bookmark toggles and simple bookmark edits are the first viable queued writes. Offline bookmark creation must queue the original user intent because the server path normalizes URLs, de-dupes, may redirect into update, creates resolution jobs, and returns the authoritative bookmark record.
- The `@tanstack/react-db` adapter path imports from `react` directly. The dependency alias may be enough, but Phase 0 must verify Domstack/esbuild browser bundles and Node/static-render tests. If aliasing is not reliable, use the local Preact `useLiveQuery` adapter fallback.

## Goals

- Make the installed Breadcrum PWA usable after network loss and across hard reloads.
- Keep private API/user-content ownership in TanStack DB collections, not CacheStorage.
- Keep TanStack Query as the online fetch orchestration layer for Query DB collections.
- Keep app shell, HTML, scripts, CSS, icons, and manifest ownership in the service worker.
- Phase 1: read-only offline support for visited, prewarmed, or read-synced user content.
- Phase 2: queued offline writes and updates with replay after reconnect.
- Keep private data scoped to the logged-in user and API URL.

## Non-goals

- Offline login, password reset, passkey registration, auth token management, or admin tools.
- Offline media playback for third-party audio/video or embedded players.
- Caching API JSON in the service worker.
- Cross-device sync without reconnecting to the Breadcrum API.
- Conflict-free collaborative editing. Phase 2 can start with last-write-wins for narrow updates, then add conflicts.

## Architecture

### Split the caches

Use two separate storage layers:

| Layer | Owns | Storage | Strategy |
|---|---|---|---|
| Service worker | Static shell: HTML, route JS, global JS, CSS, icons, manifest, static images needed for the PWA | CacheStorage | Cache-first for immutable/static assets, network-first with cached fallback for navigations |
| TanStack DB | Private user-content collections and local-first derived views | Browser OPFS/SQLite persistence | Hydrate collections before offline UI, clear per user/API namespace |
| TanStack Offline Transactions | Queued writes in phase 2 | IndexedDB with localStorage fallback | Outbox-first queued replay after reconnect |
| TanStack Query | Online fetch orchestration for query-backed collections | In-memory QueryClient cache | Transport/cache coordination only, not the durable offline store |

Do not cache `/api/*` responses in the service worker. TanStack DB collections own private API data.

### Persistent data storage

Use TanStack DB collection persistence for private offline data:

- DB collections can derive list/detail/tag/search views locally.
- Archive detail pages can contain large readability content, so `localStorage` is not a good primary storage target.
- OPFS/SQLite persistence is the phase 1 storage target.
- Offline writes use a transaction outbox in phase 2.

Add these dependencies in `packages/web`:

- `@tanstack/db`
- `@tanstack/query-core`
- `@tanstack/query-db-collection`
- `@tanstack/react-db`
- `react: npm:@preact/compat@^18.3.1`
- `@tanstack/browser-db-sqlite-persistence` once the DB adapter spike passes
- `@journeyapps/wa-sqlite` when adding browser SQLite persistence
- `@tanstack/offline-transactions` in phase 2

### Preact DB adapter

Use the package alias approach from Bret's "Simple TanStack Query with Preact" post:

```json
{
  "dependencies": {
    "@tanstack/db": "...",
    "@tanstack/query-core": "...",
    "@tanstack/query-db-collection": "...",
    "@tanstack/react-db": "...",
    "react": "npm:@preact/compat@^18.3.1"
  }
}
```

Phase 0 adapter tasks:

- Use `@tanstack/react-db` through the `react` package alias.
- Add `@tanstack/query-core` explicitly with the DB dependencies because `@tanstack/query-db-collection` declares it as a peer dependency.
- If the alias causes build, SSR/static-render, test, or duplicate-runtime problems, write a local `packages/web/client/lib/use-live-query.js` Preact adapter by porting only `useLiveQuery`.
- Do not port `useLiveSuspenseQuery`, `useLiveInfiniteQuery`, or `usePacedMutations` until Breadcrum has a direct need.

The local adapter should:

- identify or create a DB live query collection
- call `startSyncImmediate()`
- subscribe with `collection.subscribeChanges()`
- expose a stable snapshot via `useSyncExternalStore`
- derive `state`, `data`, status flags, and `collection`

Use DB persistence namespaces that include:

- app name: `breadcrum`
- schema version, for example `offline-v1`
- `state.apiUrl`
- `state.user?.id` when known

Example key shape:

```txt
breadcrum:db:offline-v1:/api:<user-id>
```

When no user is known, do not restore private collections. Once `useUser()` resolves a logged-in user, open that user's DB namespace.

### DB boot sequence

The current provider is synchronous. DB-backed offline pages should not render from an empty collection if a persisted collection is available.

Add a new module, likely `packages/web/client/lib/offline-db.js`, that:

- gets the singleton from `getQueryClient()` for Query DB collections
- opens the per-user/API DB persistence backend
- creates or returns shared collection instances for bookmarks, archives, episodes, feeds, and derived tags
- starts collection sync when online and the user is known
- returns a promise that is reused by all entry points
- exposes `clearOfflineData()` for logout and account-level "clear offline data"

Update `mountPage()` and `global.client.js` so offline-aware pages can wait for this preparation before rendering DB-derived views.

### Query client settings

Update `getQueryClient()` conservatively:

- `queries.networkMode`: `offlineFirst` for collection fetches that can tolerate cached/local data.
- keep `retry: 0` initially to preserve existing behavior and avoid noisy offline retries.
- keep `refetchOnWindowFocus: false`.

DB collections:

- `bookmarks`
- `archives`
- `episodes`
- `feeds`
- `tags` if server-computed, otherwise derive locally from bookmarks

Suggested denylist:

- `user` - already mirrored through LSP and should be cleared aggressively on logout
- `flags` - already mirrored through LSP
- `passkeys`
- `auth-tokens`
- `admin-*`
- `pgboss-dashboard`
- `episode-preview`
- login/logout/register/password reset flows

Before enabling persistence, ensure every collection ID, storage namespace, and query-backed collection key is scoped to `user?.id` and `state.apiUrl` where private data is involved. A later browser session must not show one account's cached data under another account.

### Local-first read model

Use two read layers:

1. TanStack DB collections for durable local data, optimistic local patches, and live derived views.
2. Best-effort snapshot APIs for online revalidation.

The existing hidden `/api/delta` routes are the right place to feed DB collections. Keep them simple:

- `/api/delta/last_update`: optional coarse signal for whether a collection might need refetching.
- `/api/delta/bookmarks`: returns a complete user-owned bookmark snapshot for the requested filters.
- `/api/delta/feeds`: returns a complete user-owned feed snapshot.
- Follow-up endpoints can return complete archive, episode, tag, or account-adjacent snapshots if they stop fitting inside bookmark/feed snapshots.

Start with DB collections:

- `bookmarksCollection`
- `archivesCollection`
- `episodesCollection`
- `feedsCollection`
- `tagsCollection` if tags remain server-computed, or derive tags from bookmarks locally

Use `queryCollectionOptions()` with the existing Breadcrum `QueryClient` and a full-array fetch. The backing `/api/delta/*` endpoints should keep returning complete collection state while this remains best-effort offline support.

Deletes, server-side edits, tag membership changes, and feed changes are reconciled by replacing/refetching the snapshot while online.

Do not duplicate the page data flow. The preferred hook shape is:

- pages keep calling existing hooks such as `useBookmarks()`
- existing hooks keep their current return shape
- inside each hook, TanStack Query remains the online fetch/revalidation path
- inside each hook, TanStack DB provides the offline fallback read model
- collection refetches happen while online on mount, reconnect, and browser page restore

Avoid page-level branches like `const selected = offline ? useOfflineBookmarks() : useBookmarks()`. Keep `useOffline*` helpers private or temporary during migration, then delete them once their logic has moved into the existing hooks.

Revalidate cached snapshots when:

- the app boots and the user is authenticated
- the browser reconnects after being offline
- a browser `pageshow` restore or visibility return exposes an offline-capable page while online
- a queued mutation replay batch finishes
- the user navigates to or mounts an offline-capable page while online

Do not build cursor-based incremental sync, tombstones, revision tables, or trigger-based invalidation in the first pass. If full snapshots become too expensive, add incremental sync later with an explicit cost/benefit decision.

Use DB collections while offline:

- list pages render from DB live queries when offline-capable collections are ready
- detail pages derive by ID from DB collections
- tag pages derive counts from bookmarks if tags are not a standalone collection
- search pages can run a basic client-side DB/live-query search over cached title, URL, note, summary, and tags

Offline client-side search covers synced metadata. Archive full-content sync can be a later opt-in because it has the highest storage and privacy cost.

### Service worker strategy

Expand `packages/web/client/service-worker.template.js` into a versioned worker:

- derive cache names from `version` and an offline schema version
- `install`: pre-cache core PWA shell assets
- `activate`: delete old Breadcrum caches
- `fetch`:
  - ignore non-GET requests
  - ignore `/api/*`
  - for navigations, use network-first and fall back to cached route HTML or a generic offline shell
  - for same-origin static assets, use cache-first with background refresh where useful
  - avoid caching cross-origin embeds/media for phase 1

Because `packages/web/public` is generated by Domstack, do not hard-code hashed output names by hand. Add one of these:

- a generated precache manifest emitted during `build:domstack`
- a service worker template input that receives Domstack route and asset output
- a small post-build script that scans `public/` and writes a route/static asset manifest consumed by the service worker

Phase 1 can start with an explicit route list plus runtime caching, but the final version should be build-manifest driven.

Core shell routes to support offline after install or first visit:

- `/`
- `/bookmarks/`
- `/bookmarks/view/`
- `/bookmarks/add/`
- `/archives/`
- `/archives/view/`
- `/episodes/`
- `/episodes/view/`
- `/feeds/`
- `/search/`
- `/search/bookmarks/`
- `/search/archives/`
- `/search/episodes/`
- `/tags/`
- `/account/`

For phase 1, `/bookmarks/add/` should load offline but submit controls should be online-only. In phase 2, it becomes the main offline create flow, including PWA `share_target`.

### PWA manifest updates

The existing manifest is a good start. Consider these updates for the experiment:

- change `display` from `minimal-ui` to `standalone` if install UX is preferred
- add `scope: '/'`
- keep `start_url: '/bookmarks'`
- keep `share_target` pointing to `/bookmarks/add`
- include an offline-capable route in screenshots after the feature lands

### Online/offline state

Add a small client utility, likely `packages/web/client/hooks/useOnlineStatus.js`, that reads TanStack's `onlineManager` state and browser `online`/`offline` events.

Use it to:

- pause read polling in `useResolvePolling` while offline
- show an understated header status: offline, cached, syncing, or pending changes
- disable phase 1 write buttons while offline
- trigger TanStack Offline Transactions replay in phase 2 after reconnect

## Phase 0: TanStack DB adapter spike

- Add `@tanstack/db`, `@tanstack/query-db-collection`, and `@tanstack/react-db`.
- Add `@tanstack/query-core` explicitly.
- Add `react: npm:@preact/compat@^18.3.1` in the relevant package dependency graph.
- Verify `@tanstack/react-db` imports resolve to Preact compat in browser bundles and Node/static-render tests.
- Create one `bookmarksCollection` module using `queryCollectionOptions()` and the existing `getQueryClient()`.
- Add a small page/component spike that calls `useLiveQuery()` from `@tanstack/react-db` in a Preact/HTM component.
- Validate with:
  - `pnpm --filter @breadcrum/web run test:eslint`
  - `pnpm --filter @breadcrum/web run test:tsc`
  - `pnpm --filter @breadcrum/web run test:node`
  - `pnpm --filter @breadcrum/web run build`
- If the alias path fails, replace the spike import with a local Preact `useLiveQuery` adapter and keep `@tanstack/db` plus `@tanstack/query-db-collection`.

## Phase 1: read-only offline

### 1. Persistence foundation

- Add TanStack DB collection persistence dependencies after the phase 0 adapter spike passes.
- Add `@journeyapps/wa-sqlite` with `@tanstack/browser-db-sqlite-persistence`.
- Add `offline-db.js` with open, startSync, clear, and storage namespace helpers.
- Use OPFS/SQLite persistence through `@tanstack/browser-db-sqlite-persistence`; document unsupported-browser behavior, worker requirements, single-tab defaults, and fallback behavior for the experiment.
- Update `mountPage()` and `global.client.js` so DB persistence opens before DB-derived offline views render.
- Update `getQueryClient()` only for collection transport behavior, especially `networkMode`.
- Add user ID and API URL to every private collection namespace.

### 2. Read-only sync and prewarm

- Implement the hidden `/api/delta/last_update` and `/api/delta/bookmarks` routes enough to support a read-only bookmark snapshot.
- Decide whether archive/episode/feed/tag data is embedded in the bookmark snapshot payload or exposed through separate full-snapshot endpoints.
- Add DB collection modules for bookmarks first, then archives, episodes, feeds, and derived tags.
- Add a client sync hook, likely `useOfflineReadSync()`, that runs after `useUser()` resolves and the app is online, and starts/refetches DB collections.
- Re-run that sync hook on reconnect so online state replaces stale offline state.
- Fold page-facing offline reads into the existing hooks so pages do not need to import both network and offline hooks.
- Store sync results in DB collections.
- On first login after enabling offline mode, prewarm:
  - app shell routes through the service worker
  - first pages for bookmarks, archives, episodes, feeds, tags, and searches where feasible
  - DB collections/delta snapshot queries for complete read-only coverage
- Use DB collection-derived data for offline route rendering.
- Keep full archive content out of automatic sync until storage/privacy tradeoffs are decided.

### 3. Service worker app shell

- Replace the install-only service worker with versioned CacheStorage logic.
- Add route/navigation fallback behavior.
- Add static asset caching.
- Explicitly bypass `/api/*` requests.
- Add activate cleanup for old Breadcrum caches.
- Improve registration logging in `global.client.js` to detect `updatefound` and optionally message users when an update is ready.

### 4. Read-only UI behavior

- Add an online/offline hook.
- Disable or mark offline-only controls for:
  - bookmark edit/delete/toggles
  - archive edit/delete
  - episode edit/delete
  - feed edit
  - account fields
  - admin/security operations
- Keep navigation, client-side search over synced DB collections, list rendering, and detail rendering usable.
- Show a clear empty-cache state when a route has no synced local data.
- Stop resolve polling while offline.

### 5. Logout and user-switch cleanup

- Extend `logout/client.js` to clear:
  - TanStack in-memory cache
  - TanStack DB collections for the current user/API namespace
  - TanStack Offline Transactions outbox entries for the current user/API namespace
- On login, if `state.user?.id` changes, switch namespaces and do not reuse the prior user's local collections.
- Add an account action for "Clear offline data" once phase 1 is usable.

### 6. Validation

- Run normal checks:
  - `pnpm --filter @breadcrum/web run test:eslint`
  - `pnpm --filter @breadcrum/web run test:tsc`
  - `pnpm --filter @breadcrum/web run test:node`
  - `pnpm --filter @breadcrum/web run build`
- Add Node tests for:
  - storage namespace generation
  - DB collection creation and selectors
  - offline snapshot selectors
  - logout cache-clear helper
  - service worker template includes install/activate/fetch handlers and skips `/api/`
- Manual browser checks:
  - warm `/bookmarks`, `/archives`, `/episodes`, `/feeds`, `/tags`, and search pages
  - switch browser offline
  - hard reload those routes
  - verify cached data renders and write controls are disabled
  - open an unvisited detail route for an item present in the snapshot and verify offline rendering
  - log out and verify cached private data no longer renders

## Phase 2: best-effort queued offline writes and updates

Use TanStack DB collection operations backed by TanStack Offline Transactions.

Queued writes are best-effort. The client may show optimistic local state while offline, but the server remains authoritative. When the browser is online again, replay queued mutations and then refetch the affected full snapshots to reconcile deletes, server-side mutations, normalized URLs, duplicate handling, generated archives/episodes, and other derived changes.

Start with bookmark toggles and simple bookmark edits before attempting creates, archive edits, episode edits, or feed edits. Bookmark creation queues the original submit/share intent rather than only a row-shaped optimistic record, because the server creates the authoritative record after URL normalization, de-dupe handling, and optional resolution jobs.

### 1. Create DB write handlers

Add collection write handlers and matching outbox action modules under `packages/web/client/lib/offline-writes/`.

Each queued write needs:

- stable action type
- serializable variables
- local entity ID and server entity ID when available
- optimistic collection patch
- REST API replay function
- server reconciliation on success
- rollback, retry, or failed-queue state on error
- full-snapshot refetch after successful replay

Initial outbox action types:

- `bookmark.create`
- `bookmark.update`
- `bookmark.delete`
- `archive.update`
- `archive.delete`
- `episode.update`
- `episode.delete`
- `feed.update`

DB collection handlers:

- `bookmarksCollection.onInsert`
- `bookmarksCollection.onUpdate`
- `bookmarksCollection.onDelete`
- `archivesCollection.onUpdate`
- `archivesCollection.onDelete`
- `episodesCollection.onUpdate`
- `episodesCollection.onDelete`
- `feedsCollection.onUpdate`

Keep these online-only in phase 2:

- auth tokens
- passkeys
- password/email security flows
- admin users, flags, pgboss, stats, redis cache

### 2. Boot the outbox before rendering queued state

Boot order for phase 2:

1. create/get `QueryClient` for collection transport
2. open the user/API TanStack DB persistence namespace
3. create shared DB collections and local indexes
4. create the TanStack Offline Transactions outbox for the same namespace
5. register replay handlers for known outbox action types
6. start DB read sync and outbox replay when online
7. render the app

Queued local collection changes and replay metadata must be available before the UI shows pending rows or pending-change counts.

### 3. Optimistic updates

Start with narrow, predictable optimistic updates:

- bookmark toggles: update `toread`, `starred`, and `sensitive` in the bookmarks collection
- bookmark edits: patch the matching bookmark record
- deletes: mark deleted or remove from local collections according to server semantics
- archive/episode edits: patch matching archive, episode, feed, and derived search views
- feed edits: patch `feed-details`

For offline bookmark creation:

- generate a temporary local ID such as `local:<crypto.randomUUID()>`
- insert the optimistic bookmark into the bookmarks collection
- store original share target/query params as outbox variables
- when the server returns the real bookmark, replace the temporary ID across local collections
- then refetch related collection queries after reconnect

Do not queue derived archive or episode creation independently. Let the server create those through the normal bookmark resolution pipeline after the bookmark create mutation reaches the API.

### 4. Queue UI

Add a small pending-change surface in the header or account page:

- count pending outbox actions
- show "syncing" while replay is running
- show failed queued writes with retry and discard controls
- indicate optimistic rows with subtle text such as "pending sync"

Avoid detailed queue management in phase 2 until the basic replay path is reliable.

### 5. Conflict handling

Start with last-write-wins only for low-risk fields if needed, but capture enough metadata to support conflicts:

- original entity ID
- original `updated_at`
- payload patch
- local mutation timestamp
- server response or failure

Recommended follow-up API hardening:

- support `If-Match`/ETag or `updated_at` preconditions for updates and deletes
- return `409` or `412` on stale writes
- add a conflict review UI for stale offline edits

### 6. Reconciliation and invalidation

On successful replay:

- patch DB collections with the server response for the directly affected entity
- refetch broader collection snapshots after the replay batch completes
- restart resolve polling only when online
- surface server failures instead of silently dropping queued changes

Online revalidation is the main invalidation mechanism. Avoid special-case tombstones/revision tracking unless snapshot refetching becomes demonstrably too expensive.

On failed replay:

- leave the mutation visible in the pending-change UI
- allow retry after reconnect
- allow discard with explicit user action

## Storage and privacy risks

- Offline data is private account data stored in browser storage and is not encrypted by Breadcrum.
- Sensitive bookmarks can be persisted if the user has loaded them with `state.sensitive = true`.
- The experiment should ship behind a feature flag until cleanup, logout, and user-switch behavior is verified.
- Do not persist auth tokens, passkey lists, admin dashboards, or server operational data.
- Add a visible "Clear offline data" control before making offline persistence default.

## Open questions

- Should offline caching be opt-in because Breadcrum can include sensitive bookmarks and full-text archive content?
- What max age is acceptable for private data: 24 hours, 7 days, or user-configurable?
- Should `archive-view` full-content payloads be persisted by default, or only when a user explicitly opens/saves them for offline reading?
- Should phase 2 implement conflict preconditions before allowing offline edits beyond bookmark toggles?
- Should service worker updates activate immediately with `skipWaiting()`, or should the user decide when to refresh?

## Milestones

- M0: TanStack DB adapter spike using `@tanstack/react-db` plus `react: npm:@preact/compat`, with local Preact adapter fallback.
- M1: TanStack DB persisted collections with user/API-scoped namespaces.
- M2: Bookmark DB collection plus read-only delta snapshot and offline selectors.
- M3: Archive, episode, feed, and tag collections or derived selectors.
- M4: Versioned service worker shell caching with `/api/*` bypass.
- M5: Read-only offline UI and polling pause behavior.
- M6: Logout/user-switch offline data cleanup.
- M7: DB collection write handlers and Offline Transactions replay.
- M8: Offline bookmark create/edit/toggle/delete with optimistic collection updates.
- M9: Offline archive, episode, and feed updates.
- M10: Pending-change UI, retry/discard controls, and conflict follow-up.
