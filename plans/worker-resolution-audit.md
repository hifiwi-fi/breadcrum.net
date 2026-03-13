# Worker Resolution Audit: Bookmark, Episode, Archive

## Overview

This document audits the resolution pipeline for bookmarks, episodes, and archives. The core finding is that **bookmarks frequently get stuck with `done=false` indefinitely** due to silent failures in the resolution chain, and the design has several asymmetries that make the system hard to reason about.

---

## Resource State Model

### Bookmark
- Column: `done BOOLEAN DEFAULT FALSE`
- No `error` column populated by worker (column exists but unused)
- `done=true` means fully resolved; `done=false` means either pending or stuck
- **No way to distinguish stuck from pending**

### Episode
- Column: `done BOOLEAN DEFAULT FALSE`, `error TEXT`
- Generated: `ready = done AND coalesce(error, '') = ''`
- `done=true, error=NULL` = success
- `done=true, error=<stack>` = permanent failure
- `done=false` = in queue or scheduled for future

### Archive
- Column: `done BOOLEAN DEFAULT FALSE`, `error TEXT`
- Generated: `ready = done AND coalesce(error, '') = ''`
- Same semantics as episodes: `done` is always set to `true` on job completion (success or failure)

---

## Resolution Flows

### Bookmark Resolution Flow

```
Incoming Job: { userId, bookmarkId, url, resolveBookmark, resolveEpisode, resolveArchive }

1. [if resolveEpisode]
   └─ getYTDLPDiscoveryMetadata()
      ├─ SUCCESS → createEpisode() → upcomingCheck()
      │            ├─ upcoming → send delayed resolveEpisodeQ job (+3min)
      │            └─ not upcoming → finalizeEpisode()
      └─ FAILURE (caught) → [YouTube only] createEpisode() + send delayed resolveEpisodeQ job (+10s)
                            [non-YouTube] continue silently

2. [if (resolveBookmark || resolveArchive) && !isYouTube]
   └─ fetchHTML()
      ├─ SUCCESS → document created
      └─ FAILURE (caught) → document = undefined, continue silently ⚠️

3. [if resolveBookmark && document]
   └─ getSiteMetadata()
      ├─ SUCCESS → pageMetadata populated
      └─ FAILURE (caught) → pageMetadata = undefined, continue silently ⚠️

4. [if resolveArchive && document]
   └─ extractArchive()
      ├─ SUCCESS → article populated
      └─ FAILURE (caught) → article = undefined, continue silently ⚠️

5. [if resolveBookmark && pageMetadata]
   └─ UPDATE bookmarks SET done=true ...
      ← SKIPPED if step 2 or 3 failed ⚠️

6. [if resolveArchive && article with title+content]
   └─ createArchive() → finalizeArchive() → archive.done=true
      ← SKIPPED if step 2 or 4 failed ⚠️
```

**Retry config**: `retryLimit: 0` — no retries, ever.

### Episode Resolution Flow

```
Incoming Job: { userId, episodeId, url, ... }

1. getYTDLPDiscoveryMetadata() [maxRetries: 0 — pg-boss handles retries]
   ├─ FAILURE → finalizeEpisodeError() [done=true, error=<stack>] → throw (triggers retry)
   └─ SUCCESS → media populated

2. media.title check
   └─ missing → throw Error('No media found') → finalizeEpisodeError() → throw

3. upcomingCheck(media)
   ├─ IS upcoming → send new resolveEpisodeQ job with startAfter=releaseTime+3min
   │               → `continue` (job completes, episode stays done=false until scheduled time)
   └─ NOT upcoming → continue to finalization

4. [optional] resolveEpisodeEmbed() — non-fatal, failure ignored

5. finalizeEpisode() → episode.done=true, episode.error=NULL
```

**Retry config**: `retryLimit: 4` (non-YouTube) or `retryLimit: 12` (YouTube), exponential backoff, max 1h between retries.

### Archive Resolution Flow

```
Incoming Job: { userId, archiveId, url }

1. fetchHTML()
   └─ FAILURE → caught → UPDATE archives SET done=true, error=<stack> → return (no throw)

2. createDocument(html)

3. extractArchive(document)
   └─ FAILURE (missing title/content) → caught → UPDATE archives SET done=true, error=<stack> → return

4. finalizeArchive() → archive.done=true, archive.error=NULL
```

**Retry config**: inherits default — effectively `retryLimit: 0` (no explicit retry config on archive queue).

---

## Critical Bugs

### 1. Bookmark Stuck with `done=false` — Most Common Issue

**Root cause**: Conditional chain. Each step guards the next. Any silent failure in steps 2–4 prevents the bookmark from ever being marked `done=true`. Since `retryLimit=0`, there is no recovery.

**Affected scenarios**:
- URL returns non-200 response (network error, paywalled, rate-limited)
- `getSiteMetadata()` throws on malformed HTML
- Site serves content that crashes Readability
- Response timeout (15s headers, 15s body — not long for some sites)
- Twitter/X sessions expired (UA spoofing may be stale)

**Result**: `bookmarks.done=false` permanently. The record gives no indication of failure.

**Fix needed**: Bookmark worker must set `done=true` (with optional `error`) even on failure paths, so there's no ambiguity between "pending" and "stuck".

---

### 2. Delayed Episode Jobs Can Be Silently Lost ✅ Partially Fixed

**Location**: `bookmarks/index.js` — YouTube fallback path (~line 102)

The YouTube failure fallback `resolveEpisodeQ.send()` is now wrapped in try/catch (lines 102–130). If scheduling fails, it logs the error and continues processing rather than crashing the job.

**Remaining gap**: The upcoming episode send in the bookmark worker (~line 244) is still inside an outer try/catch that calls `finalizeEpisodeError` on failure — the episode gets marked `done=true, error=<stack>` but the bookmark itself is still not finalized. This is subsumed by Bug 1.

---

### 3. Upcoming Episode Reschedule Without Failure Tracking

**Location**: `episodes/index.js` lines 62-78

When an episode is marked "upcoming", the worker enqueues a new job with `startAfter=releaseTime`, then calls `continue` (which completes the current job without setting `done=true`). This is correct for the happy path.

**Problem**: If the rescheduled `resolveEpisodeQ.send()` fails to enqueue, the exception propagates to the outer catch, which calls `finalizeEpisodeError` (marking the episode `done=true, error=<stack>`) and rethrows. pg-boss will retry the job, but on retry, the episode is already marked done with an error — the retry will set `done=true, error=NULL` if it succeeds, which is fine. However, if retries are exhausted, the episode stays errored permanently. This is an edge case rather than a silent-loss scenario.

---

### 4. Archive Worker: Permanent Failure, No Retry

The archive worker catches errors and marks `done=true, error=<stack>` without rethrowing. This means:
- One transient network failure = permanently failed archive
- No retry is ever attempted

This is **asymmetric** with the episode worker, which retries up to 12 times (YouTube). Given archives are just HTML fetch + Readability extraction (no external API dependencies), transient failures are likely.

---

### 5. Bookmark `error` Column Never Populated ✅ Fixed

Fixed by Priority 1: the `else if (resolveBookmark)` fallback now writes `error = 'Resolution failed: unable to fetch or extract metadata'` when metadata was unavailable.

---

## Retry Configuration Summary (Updated)

| Worker | Queue retryLimit | Throws on error? | Gets pg-boss retries? |
|--------|-----------------|-----------------|----------------------|
| Bookmark | 0 | No | No (intentional — creates resources) |
| Episode | 4 (non-YT) / 12 (YT) | Yes (after marking done) | Yes |
| Archive | 3 | Yes (after marking done) | Yes |

---

## State Machine Summary

### Bookmark
```
done=false (created)
   ↓ [only if fetch + metadata both succeed]
done=true ✓

Stuck: done=false forever if any step fails (no error recorded, no retry)
```

### Episode
```
done=false (created)
   ↓ [if upcoming]
done=false + new job scheduled (waiting for release)
   ↓ [after scheduled time]
done=true, error=NULL ✓ (success)
done=true, error=<stack> ✗ (exhausted retries)

Well-handled: always eventually reaches done=true
```

### Archive
```
done=false (created)
   ↓
done=true, error=NULL ✓ (success)
done=true, error=<stack> ✗ (first failure, no retry)

Partially handled: always reaches done=true, but never retries transient failures
```

---

## Proposed Fixes

### Priority 1: ✅ Fixed — Bookmarks must always set `done=true`

Added `else if (resolveBookmark)` fallback after the success block in `bookmarks/index.js`. When `pageMetadata` is unavailable (fetch or extraction failed), the bookmark is marked `done=true, error='Resolution failed: unable to fetch or extract metadata'`. No bookmark can remain permanently `done=false` after this.

### Priority 2: ✅ Partially Done — Guard `resolveEpisodeQ.send()` calls in bookmark worker

The YouTube fallback `send()` is now wrapped in try/catch. The upcoming episode `send()` in the bookmark worker falls inside an outer try/catch that at least records the error on the episode entity. No further action needed here — the remaining gap is covered by Priority 1.

### Priority 3: ✅ Fixed — Add retry to archive queue

Added `retryLimit: 3, retryDelay: 5, retryBackoff: true` to `resolve-archive-queue.js`. Archive worker now throws after recording the error, enabling pg-boss retries. Added `error = NULL` to `finalize-archive.js` so a successful retry clears the error from a previous failed attempt.

### Priority 4: ⏭ Skipped — Validate state at job completion

A post-job DB check (`SELECT done FROM ... WHERE id = ?`) to catch regressions where new code paths silently skip finalization. Skipped because: root causes are fixed (P1–P3), the nightly cleanup is an adequate runtime backstop, and the extra SELECT-per-job overhead isn't justified at this time.

---

## Priority 0: Nightly Stale Record Cleanup Job ✅ Implemented

A safety-net cron job that runs nightly and forcefully marks any `done=false` records older than 24h as `done=true` with a generic error message. This is a backstop — it does not replace fixing the root causes, but ensures records never stay pending indefinitely regardless of future bugs.

### What it does

```sql
-- Bookmarks stuck pending for > 24h
UPDATE bookmarks SET done = true, error = 'Timed out: marked done by cleanup job'
WHERE done = false AND created_at < NOW() - INTERVAL '24 hours'

-- Episodes stuck pending for > 24h (exclude upcoming: those have done=false intentionally)
-- Note: episodes with a scheduled future job are intentionally done=false, so we can't
-- easily distinguish them without checking pg-boss. Use a longer window (e.g. 48h) or
-- accept some false positives. Alternatively only clean up episodes with no pending job.
UPDATE episodes SET done = true, error = 'Timed out: marked done by cleanup job'
WHERE done = false AND created_at < NOW() - INTERVAL '24 hours'

-- Archives stuck pending for > 24h
UPDATE archives SET done = true, error = 'Timed out: marked done by cleanup job'
WHERE done = false AND created_at < NOW() - INTERVAL '24 hours'
```

**Concern for episodes**: An upcoming episode (e.g. a premiere 6 days away) legitimately has `done=false`. A 24h window would incorrectly mark it as failed. Options:
1. Use a much longer window (e.g. 7 days) for episodes only
2. Cross-reference pg-boss scheduled jobs — skip episodes that have a pending job
3. Accept that the cleanup job will occasionally stomp on upcoming episodes (they'd just be re-resolved when the episode worker runs)

**Recommendation**: Use 7 days for episodes, 24h for bookmarks and archives.

### One-time backfill migration

A migration (`030.do`) runs once on deploy and clears existing stuck records using the same logic. No undo needed (setting stuck records to done+error is safe and irreversible by design).

```sql
-- 030.do.mark-stale-resolutions-done.sql

-- Bookmarks stuck pending (no time filter — all existing done=false are stuck)
UPDATE bookmarks
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false;

-- Archives stuck pending
UPDATE archives
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false;

-- Episodes stuck pending older than 7 days (preserve legitimately upcoming ones)
UPDATE episodes
SET done = true,
    error = 'Timed out: marked done by backfill migration'
WHERE done = false
  AND created_at < NOW() - INTERVAL '7 days';
```

The undo migration is a no-op (cannot restore lost state):

```sql
-- 030.undo.mark-stale-resolutions-done.sql
-- No-op: cannot restore stuck records to done=false after backfill
```

### Implementation plan ✅ Complete

1. ✅ **`packages/resources/stale-resolutions/cleanup-stale-resolutions-queue.js`** (new)
2. ✅ **`packages/worker/workers/stale-resolutions/cleanup-stale-resolutions.js`** (new)
3. ✅ **`packages/worker/workers/stale-resolutions/index.js`** (new)
4. ✅ **`packages/worker/plugins/otel-metrics.js`** — 5 metrics added
5. ✅ **`packages/worker/plugins/pgboss.js`** — queue, schedule at `0 4 * * *` UTC, worker registered
6. ✅ **`packages/web/migrations/030.do.mark-stale-resolutions-done.sql`** — backfill migration
7. ✅ **`packages/web/migrations/030.undo.mark-stale-resolutions-done.sql`** — no-op undo

---

## Files Referenced

| File | Purpose |
|------|---------|
| `packages/worker/workers/bookmarks/index.js` | Main bookmark job processor |
| `packages/worker/workers/episodes/index.js` | Main episode job processor |
| `packages/worker/workers/archives/index.js` | Main archive job processor |
| `packages/worker/workers/episodes/finalize-episode.js` | Episode finalization (sets done=true) |
| `packages/worker/workers/archives/finalize-archive.js` | Archive finalization (sets done=true) |
| `packages/resources/bookmarks/resolve-bookmark-queue.js` | Bookmark queue config (retryLimit: 0) |
| `packages/resources/episodes/resolve-episode-queue.js` | Episode queue config (retryLimit: 4/12) |
| `packages/resources/archives/resolve-archive-queue.js` | Archive queue config (no retry set) |
| `packages/worker/workers/archives/fetch-html.js` | HTML fetch with 15s timeouts |
| `packages/worker/workers/bookmarks/get-yt-dlp-meta.js` | yt-dlp metadata fetch wrapper |
| `packages/resources/auth-tokens/cleanup-auth-tokens-queue.js` | Auth token queue (pattern reference) |
| `packages/worker/workers/auth-tokens/index.js` | Auth token cleanup worker (pattern reference) |
| `packages/worker/workers/auth-tokens/cleanup-stale-tokens.js` | Auth token cleanup query (pattern reference) |
| `packages/worker/plugins/pgboss.js` | pg-boss queue/worker/schedule registration |
| `packages/worker/plugins/otel-metrics.js` | OTEL metric definitions |
| `packages/web/migrations/030.do.mark-stale-resolutions-done.sql` | One-time backfill migration |
| `packages/web/migrations/030.undo.mark-stale-resolutions-done.sql` | Undo (no-op) |
