/** @import { BookmarkSyncReceipt } from './schemas/bookmark-sync.js' */

/** @param {string} operationId @param {string} bookmarkId @param {BookmarkSyncReceipt['outcome']} outcome @returns {BookmarkSyncReceipt} */
export function bookmarkReceipt (operationId, bookmarkId, outcome) {
  return { operation_id: operationId, bookmark_id: bookmarkId, outcome, fields: {}, tags: [] }
}
