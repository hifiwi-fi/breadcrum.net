/**
 * @import { YTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 * @import { ExtractMetaMeta } from '@breadcrum/extract-meta'
 */

import { extractMeta } from '@breadcrum/extract-meta'
import { isYouTubeUrl } from '@bret/is-youtube-url'

/**
 * @param  {object} params
 * @param  {Document} params.document
 * @param  {YTDLPMetadata | undefined} params.media
 * @param  { URL } params.url
 * @returns { Promise<ExtractMetaMeta> }
 */
export async function getSiteMetadata ({
  document,
  media,
  url
}) {
  // TODO: implement document source overrides in extractMeta maybe.
  const metadata = extractMeta(document)

  if (isYouTubeUrl(url) && media) {
    if (media.title) {
      if (media.channel) {
        metadata.title = `${media.channel} - ${media.title}`
      } else {
        metadata.title = media.title
      }
    }
    if (media.description) metadata.summary = clampString(media.description, 500)
    return metadata
  } else {
    return metadata
  }
}

/**
 * Cuts string lengths down to maxLength, preserving unicode characters
 * @param  {string} str
 * @param  {number} maxLength
 * @return {string} Clamped string
 */
function clampString (str, maxLength) {
  if (typeof str !== 'string') throw new TypeError('Input must be a string')
  if (str.length <= maxLength) return str

  // Convert the string to a list of characters, taking into account Unicode
  const chars = Array.from(str)

  // Clamp the array to the desired length
  return chars.slice(0, maxLength).join('').trim()
}
