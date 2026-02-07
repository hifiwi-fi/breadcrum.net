/**
 * @import { YTDLPMetadata } from './yt-dlp-api-client.js'
 */

import { lookup } from 'mime-types'

/**
 * Resolve a mime type from yt-dlp metadata.
 * Prefers the file extension, falling back to the URL.
 *
 * @param {YTDLPMetadata} media
 * @returns {string | undefined}
 */
export function resolveMimeType (media) {
  const normalizedExt = media.ext?.trim().toLowerCase()
  const extLookup = normalizedExt
    ? lookup(normalizedExt.startsWith('.') ? normalizedExt : `.${normalizedExt}`)
    : false

  const urlLookup = !extLookup && media.url
    ? lookup(media.url)
    : false

  const resolved = extLookup || urlLookup

  return typeof resolved === 'string' ? resolved : undefined
}
