/**
 * Checks if a given URL belongs to YouTube or Google Video domains.
 *
 * @param {URL} parsedUrl - A valid URL object (already validated by Ajv).
 * @returns {boolean} - Returns true if the URL is for a YouTube or Google Video resource.
 */
export function isYouTubeUrl (parsedUrl) {
  const validHosts = new Set([
    'www.youtube.com',
    'youtube.com',
    'm.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
    'googlevideo.com'
  ])

  // Return true if the host matches any known YouTube or Google video domains
  return validHosts.has(parsedUrl.host)
}
