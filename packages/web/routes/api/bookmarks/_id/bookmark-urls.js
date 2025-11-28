/**
 * @param {Object} params
 * @param {string} params.transport
 * @param {string} params.host
 * @param {string} params.bookmarkId
 */
export function getBookmarkUrl ({
  transport,
  host,
  bookmarkId,
}) {
  return `${transport}://${host}/bookmarks/view/?id=${bookmarkId}`
}
