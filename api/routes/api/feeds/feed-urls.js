/**
 * Constructs the URL for accessing a specific feed.
 *
 * @param {Object} params - The parameters for constructing the feed URL.
 * @param {string} params.transport - The transport protocol (e.g., http, https).
 * @param {string} params.host - The host domain.
 * @param {string} params.userId - The user ID for authentication.
 * @param {string} params.token - The authentication token.
 * @param {string} params.feedId - The ID of the feed.
 * @returns {string} The constructed feed URL including the user ID and token for authentication.
 */
export function getFeedUrl ({
  transport,
  host,
  userId,
  token,
  feedId,
}) {
  return `${transport}://${userId}:${token}@${host}/api/feeds/${feedId}`
}

/**
 * Constructs the HTML URL for a specific feed.
 *
 * @param {Object} params - The parameters for constructing the feed HTML URL.
 * @param {string} params.transport - The transport protocol (e.g., http, https).
 * @param {string} params.host - The host domain.
 * @param {string} params.feedId - The ID of the feed.
 * @returns {string} The constructed HTML URL for accessing the feed.
 */
export function getFeedHtmlUrl ({
  transport,
  host,
  feedId,
}) {
  return `${transport}://${host}/feeds?id=${feedId}`
}

/**
 * Constructs the image URL for a feed.
 *
 * If an image URL is provided, it returns the provided URL; otherwise, it constructs a default image URL.
 *
 * @param {Object} params - The parameters for constructing the feed image URL.
 * @param {string} [params.imageUrl] - The provided image URL. If present, this URL is returned.
 * @param {string} params.transport - The transport protocol (e.g., http, https).
 * @param {string} params.host - The host domain.
 * @returns {string} The image URL for the feed, either the provided URL or a constructed default URL.
 */
export function getFeedImageUrl ({
  imageUrl,
  transport,
  host,
}) {
  return imageUrl ?? `${transport}://${host}/static/bread.png`
}
