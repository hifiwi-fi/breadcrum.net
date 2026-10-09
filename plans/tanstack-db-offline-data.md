# TanStack DB Offline Data Plan

## Status

Breadcrum now has a credible path for fully offline static app shells using Domstack service-worker support.

This plan investigates the next layer: offline-aware application data for common resources such as bookmarks, tags, archives, episodes, and feeds.

The current branch is `tanstack-query`, and the app already uses `@tanstack/preact-query` for client-side query caching.

## Recommendation

Start with TanStack Query persistence for common read queries.

Then spike TanStack DB on a small read-only resource, preferably tags.

Only move to TanStack DB plus a durable collection backend, such as RxDB, if true offline-first data sync and mutations become near-term goals.

## Why Not Start With Full TanStack DB Everywhere

TanStack DB is a promising reactive data graph layer, but it is not by itself a complete durable offline persistence and sync system when backed by `QueryCollection`.

`QueryCollection` integrates with TanStack Query and can make query results reactive, but the `queryFn` result is generally treated as complete collection state unless using more advanced on-demand or direct-write patterns.

That behavior is risky with Breadcrum's current cursor and filter APIs because many endpoints return scoped or paginated slices rather than complete resource sets.

For example, a bookmarks query filtered by `tag`, `starred`, `toread`, `before`, or `after` should not be allowed to replace the whole local bookmarks collection.

## Current Breadcrum Data Shape

Existing common resource hooks and pages include:

- `packages/web/client/hooks/useBookmarks.js`
- `packages/web/client/hooks/useArchives.js`
- `packages/web/client/hooks/useEpisodes.js`
- `packages/web/client/bookmarks/client.js`
- `packages/web/client/archives/client.js`
- `packages/web/client/episodes/client.js`
- `packages/web/client/tags/client.js`

Shared query setup is in:

- `packages/web/client/lib/query-provider.js`
- `packages/web/client/lib/query-client.js`

Current API responses generally look like this:

```js
{
  data: [],
  pagination: {
    before,
    after,
    top,
    bottom,
  },
}
```

Important query parameters include:

- Bookmarks: `before`, `after`, `per_page`, `url`, `exact_url`, `tag`, `sensitive`, `starred`, `toread`.
- Archives: `before`, `after`, `per_page`, `sensitive`, `starred`, `toread`, `full_archives`, `bookmark_id`, `ready`.
- Episodes: `before`, `after`, `per_page`, `sensitive`, `feed_id`, `bookmark_id`, `default_feed`, `include_feed`, `ready`.
- Tags: `sensitive`.

Useful schema-derived types already exist:

- `TypeBookmarkReadClient` from `routes/api/bookmarks/schemas/schema-bookmark-read.js`.
- `TypeArchiveReadClient` from `routes/api/archives/schemas/schema-archive-read.js`.
- `TypeEpisodeReadClient` from `routes/api/episodes/schemas/schema-episode-read.js`.

## Package Findings

Confirmed packages:

- `@tanstack/db`
- `@tanstack/query-db-collection`
- `@tanstack/rxdb-db-collection`
- `@tanstack/preact-query`

There is no official `@tanstack/preact-db` package at this time.

Avoid assuming React hook examples can be copied directly into Preact unless using `preact/compat` intentionally.

## Option 1: Persist TanStack Query Cache First

This is the recommended first step.

It fits the current code because Breadcrum already uses TanStack Query.

It can improve offline reload behavior for recently visited resources without changing the data model.

### Benefits

- Smallest implementation step.
- Works with the existing query hooks and page structure.
- Preserves current cursor pagination semantics.
- Avoids introducing a second reactive data layer before the API contract is ready.

### Constraints

- This is cache persistence, not true offline sync.
- Cached data can be stale.
- Mutations still need network access unless separately queued.
- Sensitive data persistence needs an explicit product and security policy.

### Proposed Scope

Persist non-sensitive common resource queries first.

Include user identity in persisted query keys.

Clear persisted caches on logout or user change.

Avoid persisting `sensitive=true` results initially.

## Option 2: TanStack DB QueryCollection Spike

After query persistence, spike TanStack DB on a small read-only resource.

Tags are the best first candidate because they are small, read-only from this UI, and not paginated.

### Benefits

- Tests TanStack DB's reactive live query model with low risk.
- Provides a real comparison against direct TanStack Query hooks.
- Can reveal whether joins and derived views feel useful for Breadcrum.

### Risks

- No official Preact DB hooks package exists.
- A small custom Preact subscription hook may be needed.
- QueryCollection full-state behavior must be handled carefully.
- Scoped or paginated queries should not overwrite a shared complete collection.

### Possible File Layout

```text
packages/web/client/db/
  collections.js
  use-live-query.js
  normalize-bookmark.js
```

Follow existing JSDoc conventions and import types from schema files instead of redefining resource shapes.

## Option 3: TanStack DB With Durable Collection Backend

Use this only when Breadcrum is ready to design true offline-first data sync.

Possible backends include:

- `@tanstack/rxdb-db-collection` with RxDB.
- PowerSync.
- Electric.
- Custom IndexedDB collections.

### Benefits

- Better fit for durable offline datasets.
- Can support richer local queries, joins, and eventually offline mutations.

### Costs

- Requires a real sync protocol.
- Requires deletion/tombstone support.
- Requires conflict strategy for mutations.
- Requires careful handling of sensitive user data at rest.

## Resource Fit

### Tags

Tags are the best first TanStack DB candidate.

They are small and read-heavy.

They can validate live query subscriptions with minimal pagination complexity.

### Bookmarks

Bookmarks are the highest-value resource but also the hardest.

They are heavily filtered, cursor-paginated, user-specific, and mutable.

Do not model bookmarks as one complete `QueryCollection` until sync APIs can provide complete or incremental state safely.

### Archives

Archives are a good second or third candidate.

They relate closely to bookmarks and may benefit from joins later.

### Episodes

Episodes have similar considerations to archives.

They can be cached for offline reading shells, but readiness and feed filters make full collection semantics tricky.

### Feeds

Feeds are a later candidate.

They are useful for joins but less urgent than bookmarks, archives, episodes, and tags.

## Future Sync API Shape

If Breadcrum moves beyond cache persistence, add sync-specific endpoints rather than relying on UI pagination endpoints.

Possible endpoints:

```http
GET /api/sync/bookmarks?since=<cursor>
GET /api/sync/archives?since=<cursor>
GET /api/sync/episodes?since=<cursor>
GET /api/sync/tags?since=<cursor>
```

Possible response shape:

```js
{
  data: [],
  deleted: [],
  cursor: '...',
  serverTime: '...',
}
```

The `deleted` list is important so local durable collections can remove records that no longer exist.

## Proposed Implementation Phases

### Phase 1: Query Persistence

- Add a browser persistence layer for TanStack Query.
- Persist only selected non-sensitive query keys.
- Include user identity in query keys.
- Clear persisted data on logout and user changes.
- Verify bookmarks, archives, episodes, and tags show useful cached data after offline reloads.

### Phase 2: Tags TanStack DB Spike

- Add `@tanstack/db` and `@tanstack/query-db-collection`.
- Create a tags collection backed by the existing tags query.
- Add a small Preact live-query subscription helper if needed.
- Keep the tags page UI and API surface stable.
- Compare complexity and behavior against plain TanStack Query.

### Phase 3: Normalize Common Resources

- If the tags spike is promising, define collection boundaries for bookmarks, archives, episodes, and feeds.
- Avoid destructive full-state sync for cursor-paginated or filtered endpoints.
- Consider direct writes from known query results into normalized collections.
- Keep pagination metadata separate from entity collections.

### Phase 4: Durable Offline Sync Design

- Decide whether RxDB, PowerSync, Electric, or custom IndexedDB is the right persistence backend.
- Add sync endpoints with cursors and tombstones.
- Define mutation queues and conflict behavior.
- Define sensitive data persistence policy.

## Open Questions

- Which resources are acceptable to persist on disk by default?
- Should sensitive views ever be persisted?
- What is the cache retention policy for offline data?
- Should logout clear all offline data immediately?
- Do we need encrypted-at-rest browser storage, or is browser profile storage acceptable for this scope?
- Should the first durable sync support read-only data only, or also mutation replay?

## Acceptance Criteria For A First Pass

- Recently loaded non-sensitive bookmarks, archives, episodes, and tags can render from persisted query cache when offline.
- API requests still fail clearly when the network is required.
- Logout or user changes clear persisted user-specific data.
- No `sensitive=true` query results are persisted unless explicitly approved.
- Existing pagination and filter behavior is unchanged.
- The static app shell service worker remains responsible only for app shell assets, not API data.
