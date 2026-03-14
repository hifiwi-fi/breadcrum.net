/* eslint-disable camelcase */
const RESOLVE_TIMEOUT_MS = 5 * 60 * 60 * 1000 // 5 hours

/**
 * Returns true if the item is still within the resolving window.
 * Items older than 5 hours are considered timed out and should not trigger polling.
 * @param {string | null | undefined} created_at
 */
export function withinResolvingWindow (created_at) {
  if (!created_at) return false
  return Date.now() - new Date(created_at).getTime() < RESOLVE_TIMEOUT_MS
}
