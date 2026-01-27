# Episode MIME Types Implementation (Completed)

**Issue:** #166  
**Status:** Completed  
**Branch:** mime-types

## Overview
Successfully implemented proper MIME type handling for episodes throughout the breadcrum application. Episodes now have properly resolved and persisted MIME types instead of relying on ad-hoc string concatenation.

## Implementation Summary

### 1. Shared MIME Resolver ✓
- Added `mime-types` + `@types/mime-types` to `@breadcrum/resources` dependencies
- Created `packages/resources/episodes/resolve-mime-type.js` using `mime-types.lookup()`
- Resolver accepts `YTDLPMetadata` and resolves from `ext`/`url`, falls back to `undefined`
- Added comprehensive tests in `resolve-mime-type.test.js` covering common extensions and edge cases

### 2. Episode Finalization ✓
- Updated `packages/worker/workers/episodes/finaize-episode.js` to persist `mime_type` using the new resolver
- Database schema already had `episodes.mime_type` column (from migration `003.do.add-podcast-anything.sql`)
- Maintained existing `src_type` behavior for UI rendering (`<audio>` vs `<video>` selection)

### 3. Data Migration ✓
- Created `packages/web/migrations/026.do.backfill-episode-mime-type.sql` with undo migration
- Migration backfills existing episodes using a `CASE` statement for known extensions
- Unknown extensions left as `null` (graceful degradation)
- Migration tested both up (to 26) and down (to 25) locally

### 4. Feed Output ✓
- Updated `packages/web/routes/api/feeds/_feed/get-feed.js` to use `ep.mime_type`
- Fallback to legacy `${src_type}/${ext}` for backwards compatibility
- Removed special-case MIME type hacks
- Preview schema unchanged (no UI requirement identified)

### 5. Validation ✓
- All tests passing with `pnpm test` (resources/web/worker packages)
- GeoIP enrichment tests appropriately skip under `CI=1` environment

## Technical Details

**Database Schema:**
- Column: `episodes.mime_type` (TEXT, nullable)
- Populated during episode finalization
- Backfilled for existing rows via migration 026

**Resolution Logic:**
1. Attempt MIME type lookup from file extension
2. Fall back to URL-based resolution if extension unavailable
3. Return `undefined` for unknown types (allows graceful handling)

**Feed Compatibility:**
- Primary: Uses `ep.mime_type` when available
- Fallback: Constructs `${src_type}/${ext}` for legacy support
- Maintains RSS/Atom feed spec compliance

## Files Modified
- `packages/resources/episodes/resolve-mime-type.js` (new)
- `packages/resources/episodes/resolve-mime-type.test.js` (new)
- `packages/worker/workers/episodes/finaize-episode.js`
- `packages/web/routes/api/feeds/_feed/get-feed.js`
- `packages/web/migrations/026.do.backfill-episode-mime-type.sql` (new)
- `packages/web/migrations/026.undo.backfill-episode-mime-type.sql` (new)

## Notes
- Migration currently at level 25 (after down-migration testing)
- To apply: Run `./node_modules/.bin/postgrator 026` in `packages/web` directory
- GeoIP enrichment tests can be run with actual `MAXMIND_*` credentials (without `CI=1`)
