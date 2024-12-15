/**
 * Normalizes a URL object by modifying its host property if necessary.
 *
 * @param {string} url - The URL string to be normalized.
 * @returns {Promise<URL>} An object containing the normalized URL string.
 */
export async function normalizeURL (url) {
  const urlObj = new URL(url)
  if (urlObj.host === 'm.youtube.com') urlObj.host = 'www.youtube.com'
  return urlObj
}
