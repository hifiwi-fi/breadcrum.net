export function getBookmarkUrl ({
  transport,
  host,
  bookmarkId
}) {
  return `${transport}://${host}/bookmarks/view/?id=${bookmarkId}`
}
