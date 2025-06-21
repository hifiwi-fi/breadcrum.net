/**
 * @import { FastifyInstance } from 'fastify'
 * @import PgBoss from 'pg-boss'
 * @import { ResolveEpisodeData } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
 */
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { finalizeEpisode, finalizeEpisodeError } from './finaize-episode.js'
import { upcomingCheck } from './handle-upcoming.js'

/**
 * pg-boss compatible episode processor
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {PgBoss.WorkHandler<ResolveEpisodeData>} pg-boss handler
 */
export function makeEpisodePgBossP ({ fastify }) {
  const logger = fastify.log

  /** @type {PgBoss.WorkHandler<ResolveEpisodeData>} */
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

      try {
        const media = await getYTDLPMetadata({
          url,
          medium,
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          attempt: 0, // pg-boss handles retries differently
          cache: fastify.ytdlpCache,
        })

        const upcomingData = upcomingCheck({ media })

        if (upcomingData.isUpcoming) {
          const releaseTimestampDate = new Date(upcomingData.releaseTimestampMs)

          log.info(`Episode ${episodeId} for ${url} is scheduled at ${releaseTimestampDate.toLocaleString()}. Rescheduling job.`)

          // Use pg-boss native scheduling - send a new job with startAfter
          await fastify.pgboss.queues.resolveEpisodeQ.send({
            data: job.data,
            options: {
              startAfter: releaseTimestampDate
            }
          })

          // Job will be completed (not retried)
          continue
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
        throw handledError // Let pg-boss handle retry logic
      }
    }
  }
}
