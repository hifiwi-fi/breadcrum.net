/**
 * @import { FastifyInstance } from 'fastify'
 * @import { ResolveEpisodeP } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 */
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { DelayedError } from 'bullmq'
import { finalizeEpisode, finalizeEpisodeError } from './finaize-episode.js'
import { upcomingCheck } from './handle-upcoming.js'

/**
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {ResolveEpisodeP}
 */
export function makeEpisodeP ({ fastify }) {
  const logger = fastify.log

  /** @type { ResolveEpisodeP } */
  async function episodeP (job, token) {
    const log = logger.child({
      jobId: job.id,
    })

    const {
      userId,
      bookmarkTitle,
      episodeId,
      url,
      medium,
    } = job.data

    const pg = fastify.pg

    try {
      const media = await getYTDLPMetadata({
        url,
        medium,
        ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
        attempt: job.attemptsMade,
        cache: fastify.ytdlpCache,
      })

      const upcomingData = upcomingCheck({ media })

      if (upcomingData.isUpcoming) {
        const releaseTimestampDate = new Date(upcomingData.releaseTimestampMs)
        const jobDelayDate = new Date(upcomingData.jobDelayMs)

        log.info(`Episode ${episodeId} for ${url} is scheduled at ${releaseTimestampDate.toLocaleString()} and will be processed at ${jobDelayDate.toISOString()}.`)

        job.moveToDelayed(upcomingData.jobDelayMs, token)
        throw new DelayedError()
      }

      if (!media?.url) {
        throw new Error('No video URL was found in discovery step')
      }

      await finalizeEpisode({
        pg,
        media,
        bookmarkTitle,
        episodeId,
        userId,
        url
      })

      log.info(`Episode ${episodeId} for ${url} is ready.`)
    } catch (err) {
      if (err instanceof DelayedError) {
        // TODO make this not janky
        throw err
      }
      /** @type {Error} */
      const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })
      log.error(`Error extracting video for episode ${episodeId}`)
      log.error(handledError)
      await finalizeEpisodeError({
        pg,
        error: handledError,
        episodeId,
        userId
      })
    }

    return null
  }

  return episodeP
}
