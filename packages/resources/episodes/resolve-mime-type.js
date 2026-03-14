/**
 * @import { YTDLPDiscoveryMetadata } from './yt-dlp-api-client.js'
 */

import { lookup } from 'mime-types'

/**
 * Resolve a mime type from yt-dlp metadata.
 * Uses the file extension only — media URLs are not present in discovery metadata.
 *
 * @param {YTDLPDiscoveryMetadata} media
 * @returns {string | undefined}
 */
export function resolveMimeType (media) {
  const normalizedExt = media.ext?.trim().toLowerCase()
  const extLookup = normalizedExt
    ? lookup(normalizedExt.startsWith('.') ? normalizedExt : `.${normalizedExt}`)
    : false

  const resolved = extLookup

  return typeof resolved === 'string' ? resolved : undefined
}
