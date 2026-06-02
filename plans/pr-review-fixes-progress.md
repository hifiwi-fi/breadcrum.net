# PR Review Fixes Progress

## 2026-06-02

Review findings from the TanStack Query migration diff:

| Finding | Status | Notes |
|---|---|---|
| `BookmarkListProps.onDelete` is still required even though list/search callers omit it | Complete | Made `onDelete` optional; component already calls `onDelete?.()` |
| Feed page episode row mutations invalidate `feed-details` instead of `feed-episodes` | Complete | Added `reloadEpisodes` callback for `episodesQueryKey` and passed it to `EpisodeList` |
| Feed page calls `setParams()` from inside a TanStack `queryFn` | Complete | Moved stale cursor cleanup to an effect after query data resolves |

Validation target:

- `npm run test:tsc` in `packages/web`
