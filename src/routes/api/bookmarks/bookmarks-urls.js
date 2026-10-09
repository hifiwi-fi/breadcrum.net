/**
 * Returns the bookmark url
 * @param  {object} params          parameters object
 * @param  {string} params.transport  http or https
 * @param  {string} params.host      the host including port of the site
 * @return {string}                   the url string
 */
export function getBookmarksUrl ({
  transport,
  host,
}) {
  return `${transport}://${host}/bookmarks`
}
