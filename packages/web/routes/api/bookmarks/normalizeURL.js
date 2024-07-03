// TODO: make this normalization way more robust and use it everywhere.
/**
 * Normalizes a URL object by modifying its host property if necessary.
 *
 * @param {URL} urlObj - The URL object to be normalized.
 * @returns {Promise<{normalizedURL: string}>} An object containing the normalized URL string.
 */
export async function normalizeURL (urlObj) {
  if (urlObj.host === 'm.youtube.com') urlObj.host = 'www.youtube.com'
  return {
    normalizedURL: urlObj.toString(),
  }
}
