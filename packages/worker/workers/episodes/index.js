/**
 * @import { FastifyInstance } from 'fastify'
 * @import { WorkHandler } from '@breadcrum/resources/pgboss/types.js'
 * @import { ResolveEpisodeData } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 */
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { youtubeRetryOptions } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { isYouTubeUrl } from '@bret/is-youtube-url'
import { finalizeEpisode, finalizeEpisodeError } from './finaize-episode.js'
import { resolveEpisodeEmbed } from './resolve-embed.js'
import { upcomingCheck } from './handle-upcoming.js'

/**
 * pg-boss compatible episode processor
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {WorkHandler<ResolveEpisodeData>} pg-boss handler
 */
export function makeEpisodePgBossP ({ fastify }) {
  const logger = fastify.log

  /** @type {WorkHandler<ResolveEpisodeData>} */
  return async function episodePgBossP (jobs) {
    for (const job of jobs) {
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
      const isYouTube = isYouTubeUrl(new URL(url))
      const retryOptions = isYouTube ? youtubeRetryOptions : undefined

      const jobStartTime = performance.now()

      log.info({ userId, url, bookmarkTitle, episodeId, medium }, 'processing episode')

      try {
        // Disable internal retries - let pg-boss handle all retries at the job level
        const media = await getYTDLPMetadata({
          url,
          medium,
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          attempt: 0,
          cache: fastify.ytdlpCache,
          maxRetries: 0, // pg-boss handles retries
        })

        const upcomingData = upcomingCheck({ media })

        if (upcomingData.isUpcoming) {
          fastify.otel.episodeUpcomingCounter.add(1)
          const releaseTimestampDate = new Date(upcomingData.releaseTimestampMs)

          log.info(`Episode ${episodeId} for ${url} is scheduled at ${releaseTimestampDate.toLocaleString()}. Rescheduling job.`)

          // Use pg-boss native scheduling - send a new job with startAfter
          await fastify.pgboss.queues.resolveEpisodeQ.send({
            data: job.data,
            options: {
              startAfter: releaseTimestampDate,
              ...(retryOptions ?? {})
            }
          })

          // Job will be completed (not retried)
          continue
        }

        if (!media?.url) {
          throw new Error('No video URL was found in discovery step')
        }

        let oembed = null
        try {
          oembed = await resolveEpisodeEmbed({ fastify, url })
        } catch (err) {
          log.warn(err, 'Failed to resolve embed for episode')
        }

        await finalizeEpisode({
          pg,
          media,
          bookmarkTitle,
          episodeId,
          userId,
          url,
          oembed,
        })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.episodeProcessingSeconds.record(totalDuration)
        fastify.otel.episodeJobProcessedCounter.add(1)

        log.info(`Episode ${episodeId} for ${url} is ready.`)
      } catch (err) {
        /** @type {Error} */
        const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.episodeProcessingSeconds.record(totalDuration)
        fastify.otel.episodeJobFailedCounter.add(1)

        log.error(`Error extracting video for episode ${episodeId}`)
        log.error(handledError)
        await finalizeEpisodeError({
          pg,
          error: handledError,
          episodeId,
          userId
        })
        throw handledError // Let pg-boss handle retry logic
      }
    }
  }
}
