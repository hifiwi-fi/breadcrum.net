/**
 * Normalizes a URL object by modifying its host property if necessary.
 *
 * @param {URL} url - The URL string to be normalized.
 * @returns {Promise<URL>} An object containing the normalized URL string.
 */
export async function normalizeURL (url) {
  if (url.host === 'm.youtube.com') url.host = 'www.youtube.com'
  return url
}
