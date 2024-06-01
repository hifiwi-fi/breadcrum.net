import SQL from '@nearform/sql'
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { resolveType } from '@breadcrum/resources/episodes/resolve-type.js'
import { DelayedError } from 'bullmq'

/**
 * @import { Processor} from 'bullmq'
 */

/**
 * @param  {Object} options.fastify
 * @return {Processor}
 */
export function makeEpisodeWorker ({ fastify }) {
  const logger = fastify.log

  /** @type {Processor} */
  async function episodeWorker (job, token) {
    const log = logger.child({
      jobId: job.id
    })

    const {
      userId,
      bookmarkTitle,
      episodeId,
      url,
      medium
    } = job.data

    await fastify.pg.transact(async client => {
      const pg = client

      try {
        const metadata = await getYTDLPMetadata({
          url,
          medium,
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          attempt: job.attemptsMade,
          cache: fastify.ytdlpCache
        })

        if (metadata.live_status === 'is_upcoming' && metadata.release_timestamp) {
          const releaseTimestamp = metadata.release_timestamp * 1000 // Convert seconds to milliseconds
          const threeMinutesInMilliseconds = 3 * 60 * 1000 // 3 minutes in milliseconds

          const delayedTimestamp = releaseTimestamp + threeMinutesInMilliseconds

          const releaseDate = new Date(releaseTimestamp)
          const delayedDate = new Date(delayedTimestamp)
          const isoTimestamp = delayedDate.toISOString()

          log.info(`Episode ${episodeId} for ${url} is scheduled at ${releaseDate.toLocaleString()} and will be processed at ${isoTimestamp}.`)

          job.moveToDelayed(delayedTimestamp, token)

          throw new DelayedError()
        }

        if (!metadata?.url) {
          throw new Error('No video URL was found in discovery step')
        }

        const videoData = []

        videoData.push(SQL`done = true`)
        videoData.push(SQL`url = ${url}`)
        if ('filesize_approx' in metadata) videoData.push(SQL`size_in_bytes = ${Math.round(metadata.filesize_approx)}`)
        if ('duration' in metadata) videoData.push(SQL`duration_in_seconds = ${Math.round(metadata.duration)}`)
        if ('channel' in metadata) videoData.push(SQL`author_name = ${metadata.channel}`)
        if ('title' in metadata && 'ext' in metadata) {
          const filename = `${metadata.title}.${metadata.ext}`
          videoData.push(SQL`filename = ${filename}`)
        }

        if ('title' in metadata && metadata.title !== bookmarkTitle) {
          videoData.push(SQL`title = ${metadata.title.trim().substring(0, 255)}`)
        }
        if ('ext' in metadata) videoData.push(SQL`ext = ${metadata.ext}`)
        if ('_type' in metadata) videoData.push(SQL`src_type = ${resolveType(metadata)}`)
        if ('description' in metadata) {
          videoData.push(SQL`text_content = ${metadata.description}`)
        }
        if ('uploader_url' in metadata || 'channel_url' in metadata) {
          videoData.push(SQL`author_url = ${metadata.uploader_url || metadata.channel_url}`)
        }
        if ('thumbnail' in metadata) {
          videoData.push(SQL`thumbnail = ${metadata.thumbnail}`)
        }

        const query = SQL`
        update episodes
        set ${SQL.glue(videoData, ' , ')}
        where id = ${episodeId}
        and owner_id =${userId}
        returning type, medium;
      `

        /* const epResults = */ await pg.query(query)
        // const episode = epResults.rows.pop()

        log.info(`Episode ${episodeId} for ${url} is ready.`)
      } catch (err) {
        if (err instanceof DelayedError) {
          // TODO make this not janky
          throw err
        }
        log.error(`Error extracting video for episode ${episodeId}`)
        log.error(err)
        const errorQuery = SQL`
        update episodes
        set error = ${err.stack}, done = true
        where id = ${episodeId}
        and owner_id =${userId};`
        await pg.query(errorQuery)
      }
    })
  }

  return episodeWorker
}
