/**
 * @param {object} params
 * @param {YTDLPMetadata} params.media
 */
export function upcomingCheck ({
  media
}) {
  if (media.live_status === 'is_upcoming' && media.release_timestamp) {
    const releaseTimestampMs = media.release_timestamp * 1000 // Convert seconds to milliseconds
    const threeMinutesMs = 3 * 60 * 1000 // 3 minutes in milliseconds

    const jobDelayMs = releaseTimestampMs + threeMinutesMs

    return /** @type {const} */({
      isUpcoming: true,
      jobDelayMs,
      releaseTimestampMs
    })
  } else {
    return /** @type {const} */({
      isUpcoming: false,
      jobDelayMs: null,
      releaseTimestampMs: null
    })
  }
}

/**
 * @import { YTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 */
