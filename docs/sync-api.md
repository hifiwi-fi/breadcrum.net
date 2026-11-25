# Breadcrum sync API

The delta endpoints and the opt-in write extensions described here are **alpha (unstable)**.
They use the existing API authentication and bookmark, archive, and episode resources.
Clients authenticate as the account owner with `Authorization: Bearer <token>`.
The existing `POST /api/login` accepts `user` and `password` and returns a token.

## What sync covers

The bookmark is the unit of replication.
A bookmark upsert replaces the server copy of that bookmark and its complete tag, archive, and episode collections.
Tag names are case-insensitive memberships, and archives and episodes have stable UUIDs.
A child change refreshes the parent bookmark.
When a child is deleted, remove it if the next projection of its surviving parent omits it.
A bookmark delete removes the bookmark and its local descendants.

A bookmark projection has these fields:

| Fields | Shape |
| --- | --- |
| `id`, `url` | UUID, URL |
| `title`, `note`, `summary` | String or null |
| `created_at`, `updated_at` | Date-time, nullable updated date-time |
| `starred`, `toread`, `sensitive`, `done` | Booleans |
| `archive_urls`, `tags` | URL array, tag name array |
| `archives`, `episodes` | Complete arrays of child summaries |

Archive summaries include ID, URL, title, site name, excerpt, byline, timestamps, extraction method, and processing flags.
Episode summaries include ID, display title, timestamps, medium, author name, and processing flags.
Fetch archive bodies and hydrated episode embeds through the existing authenticated resource reads.
Feed records, private feed URLs, and media URLs stay outside the replication payload.
A server-side feed deletion can remove episodes from surviving bookmarks through the bookmark cursor.
The account’s sensitive bookmarks are included in pull responses, so clients apply their own visibility settings to local content, search, and counts.
The [delta schemas](../src/routes/api/delta/sync-schemas.js) define the complete wire shape.

## Pull a library

Both read routes return `Cache-Control: private, no-store`.
Both accept `per_page` from 1 to 200, with a default of 20.
Treat cursors and page tokens as opaque, account-scoped values.
A bootstrap page token and a changes cursor serve different routes.

### Bootstrap

1. Call `GET /api/delta/bootstrap` with no `page_token`.
   Stage the returned `bookmarks` and save the first response’s `cursor`.
2. While `next_page_token` is present, call the same route with `page_token=<next_page_token>` and stage the next page by bookmark ID.
   A null token completes the scan.
3. Catch up with `GET /api/delta/changes` from the saved cursor and apply those changes to the staged copy.
   Publish the new local baseline after catch-up reaches a page with `has_more: false`.

Bootstrap pages scan by bookmark UUID.
Writes can commit between pages.
The starting cursor lets catch-up account for edits, new bookmarks that sort behind the scan, and deletes that happened during bootstrap.
When rebuilding a local baseline, retain the existing visible library until the staged copy is ready and preserve the local outbox.

### Changes

Call `GET /api/delta/changes?cursor=<cursor>`.
A response contains `changes`, `next_cursor`, and `has_more`.
Each change has one of these shapes:

| `op` | Payload | Apply |
| --- | --- | --- |
| `upsert` | `bookmark` with a complete projection | Replace the server copy by bookmark UUID. |
| `delete` | `bookmark_id` | Remove the server copy and its descendants. |

Persist the page’s effects and `next_cursor` together.
Continue with `next_cursor` until `has_more` is false, and use that cursor on the next poll.
Persist the cursor even if the page has no changes.
A caught-up poll can return the same cursor again.

A changes window fixes its upper revision on the first page.
Changes published beyond that bound are available in later windows.
The API coalesces updates to each live bookmark and reads its current projection, so clients should apply state by ID and tolerate page replays.
If a bookmark changes again before its page is read and its latest revision is above the bound, its newer state arrives in a later window.
Keep a single active pull sequence per local library and ignore responses for a superseded request.

| Response | Handling |
| --- | --- |
| `401` | Refresh account authentication before continuing. |
| `400 invalid_sync_cursor` | Check token kind and account scope, or start a new bootstrap if the stored token is unusable. |
| `410 sync_reset_required` | Stage a new bootstrap and preserve locally queued changes. |

## Opt in to retry-safe writes

Successful delta responses advertise the supported write operations in `Breadcrum-Sync-Writes`.
The current header lists `bookmark-edit, archive-capture, archive-delete`.
A client should require an advertised operation before dispatching it automatically.
In particular, a deployment without the extension may handle a write as an ordinary edit.
Bookmark create and delete also accept keys on the server and are currently unadvertised.

Use the existing write route with an `Idempotency-Key` header containing a client-generated UUID.
The key opts in to the alpha receipt on that call.
Requests without the key keep their ordinary behavior.
Successful keyed requests return HTTP 200, `Cache-Control: private, no-store`, and a `sync` receipt.

Persist the chosen UUID, method, path, query options, and request body before the first attempt.
After a lost response, send the same intent with the same UUID.
Request object key order is immaterial, and array order must be preserved.
The key is unique across all keyed writes of an account.
Reusing it for a different intent returns HTTP 409.
The original receipt is returned even if the resource has subsequently changed or been deleted.

### Bookmark writes

| Operation | Request | Receipt outcome |
| --- | --- | --- |
| Create | `PUT /api/bookmarks` with the normal create body and `update=false` (the default) | `created` or `existing`, with the canonical bookmark ID |
| Edit | `PUT /api/bookmarks/:id` with requested scalar fields and their starting values under `sync.base` | `processed` or `bookmark_missing` |
| Delete | Bodyless `DELETE /api/bookmarks/:id` | `deleted` or `bookmark_missing` |

Bookmark receipts have `operation_id`, `bookmark_id`, `outcome`, `fields`, and `tags`.
An already-existing bookmark found during create retains its server state.
When a keyed create requests background resolution, the bookmark, job, and receipt commit together.

For an edit, send the new values at the top level and exactly the corresponding starting values under `sync.base`.
Supported scalar fields are `title`, `note`, `summary`, `starred`, `toread`, and `sensitive`.
Nullable text values preserve the difference between null and an empty string.
A title may be null or a nonempty string.

Send tag membership changes under `sync.tags` as objects with `name` and a boolean `present`.
Include each case-insensitive membership once, with at most 200 per operation.
A tag-only edit uses an empty `sync.base`.
Tag receipts contain `applied` or `already_applied` in request order.

Example body for a keyed bookmark edit:

```json
{
  "note": "My offline notes",
  "starred": true,
  "sync": {
    "base": { "note": "Original notes", "starred": false },
    "tags": [{ "name": "Reference", "present": true }]
  }
}
```

Each edited scalar is compared atomically against the saved server value:

| Server value | Disposition |
| --- | --- |
| Equals the requested value | `already_applied` |
| Equals the starting value | `applied` |
| Differs from both | `conflict` |

A conflict leaves the server value intact and independent fields can still apply.
The client can retain the conflicting draft for review, pull the current server value, and submit a reviewed edit with a new key.
A missing bookmark yields `bookmark_missing` and leaves the draft available on the client.

### Archive writes

| Operation | Request | Receipt outcome |
| --- | --- | --- |
| Capture | `PUT /api/bookmarks/:id` with only `{"createArchive":true}` or `{"createArchive":{"url":"https://example.org/article"}}` in the body | `archive_created` or `bookmark_missing` |
| Delete | Bodyless `DELETE /api/archives/:archive_id` | `archive_deleted` or `archive_missing` |

Send the capture separately from other keyed bookmark edits.
A true value captures the bookmark URL.
A successful capture commits its archive ID, capture job, and receipt together.
Pull the parent bookmark for subsequent processing status.

Archive receipts have `operation_id`, `bookmark_id`, `archive_id`, and `outcome`.
On capture with a missing parent, the archive ID is null.
On deletion with a missing archive, the bookmark ID is null.
A successful deletion is reflected in the next upsert of the surviving parent.
Removing a device-local download takes no server write.

### Reconcile a write

Persist the receipt before removing the operation from the local queue.
Pull from the last cursor to reconcile the canonical bookmark and child summaries, and preserve any conflicting field drafts separately.
A receipt reports the result at write time, so the latest pull may already reflect a subsequent change.
Use the canonical ID from a create receipt to remap any provisional reference.
If delivery is uncertain, retry the frozen request and keep the key.
If delivery is confirmed and refreshing the baseline fails, retry pull.

## Server consistency and retention

Migration [031](../migrations/031.do.sync-change-capture.sql) records changes from ordinary routes, background workers, and database cascades.
Triggers collect changed resources in the source transaction.
A deferred publisher locks each affected account’s revision head, assigns increasing revisions, and publishes the change index and tombstones before the same transaction commits.
The head lock serializes publication for a given account, so a later commit cannot appear behind a revision that clients already passed.
Read pages use a repeatable-read snapshot so the head, change index, and projections agree.
A rolled-back write publishes no change.

The change index keeps the latest revision per live bookmark.
Typed tombstones keep hard-delete IDs for bookmarks, tags, archives, episodes, and feeds.
Only bookmark tombstones are emitted as explicit delete operations on the wire.
A child deletion refreshes any surviving parent projection that it changed.

Migration [032](../migrations/032.do.sync-mutation-receipts.sql) stores each keyed outcome with the domain write.
Receipts store only operation IDs, affected resource IDs, outcomes, and dispositions.
Tombstones and receipts are retained for the lifetime of the account and removed with it.
Cursor keys are independent of login keys.
Retaining a retired cursor key allows existing pages and cursors to survive a signing-key rotation.
Incrementing the account’s cursor generation requires a fresh bootstrap without removing retained receipts.

See the [sync integration suite](../src/routes/api/delta/sync.test.js) for executable examples of paging, conflicts, receipt replay, rollback, and cascades.
