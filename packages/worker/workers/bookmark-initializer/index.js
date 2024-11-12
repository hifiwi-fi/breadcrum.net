/**
 * @import { FastifyInstance } from 'fastify'
 * @import { Processor} from 'bullmq'
 */

import SQL from '@nearform/sql'
import { JSDOM } from 'jsdom'
import { fetchHTML } from '../document-processor/fetch-html.js'
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { getSiteMetadata } from '../document-processor/get-site-metadata.js'
import { extractArchive } from '../document-processor/extract-archive.js'
import { normalizeURL } from './normalize-url.js'
import { isYouTubeUrl } from './is-yt-url.js'

/**
 * @param  {object} params
 * @param  {FastifyInstance} params.fastify
 */
export function makeBookmarkInitializerWorker ({ fastify }) {
  /** @type {Processor<
   * {
    * url: string
    * userId: string
    * bookmarkId: string
    * resolveBookmark: boolean
    * resolveArchive: boolean
    * resolveEpisode: boolean
    * userProvidedMeta: {
    *   title: string
    *   tags: string[]
    *   summary: string
    * }
   * }
   * >} */
  return async function documentWorker (job) {
    const {
      url,
      userId,
      bookmarkId,
      resolveBookmark,
      resolveArchive,
      resolveEpisode,
      userProvidedMeta,
    } = job.data
    const log = fastify.log.child({ jobId: job.id })
    const pg = fastify.pg

    const urlObj = await normalizeURL(url)

    if (isYouTubeUrl(urlObj)) {
      const metadata = await getYTDLPMetadata({
        url,
        medium: 'video',
        ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
        attempt: job.attemptsMade,
        cache: fastify.ytdlpCache,
      })

      const episodeEntity = await createEpisode({
        client,
        userId,
        bookmarkId: bookmark.id,
        type: request?.body?.createEpisode?.type ?? 'redirect',
        medium: request?.body?.createEpisode?.medium ?? 'video',
        url: request?.body?.createEpisode?.url ?? url,
      })

      // Create episode here

      if (metadata.live_status === 'is_upcoming' && metadata.release_timestamp) {
        const releaseTimestamp = metadata.release_timestamp * 1000 // Convert seconds to milliseconds
        const threeMinutesInMilliseconds = 3 * 60 * 1000 // 3 minutes in milliseconds

        const delayedTimestamp = releaseTimestamp + threeMinutesInMilliseconds

        const releaseDate = new Date(releaseTimestamp)
        const delayedDate = new Date(delayedTimestamp)
        const isoTimestamp = delayedDate.toISOString()

        log.info(`Episode ${episodeId} for ${url} is scheduled at ${releaseDate.toLocaleString()} and will be processed at ${isoTimestamp}.`)
        // Schedule an episode job here
        // job.moveToDelayed(delayedTimestamp, token)

        // throw new DelayedError()
        //
        await fastify.queues.resolveEpisodeQ.add(
          'resolve-episode',
          {
            userId,
            bookmarkTitle: bookmark.title,
            episodeId,
            url: episodeURL,
            medium: episodeMedium,
          }
        )
      }

      if (!metadata?.url) {
        throw new Error('No video URL was found in discovery step')
      }
    } else {
      // Handle Default bookmark initialization
      // Fetch the URL and check the content type
      // Try to create an archive
      // Try to fetch an episode
      // Try to extract meta on the page
      // Merge user provided meta with extracted meta
      // Create episode and archive where we have data
      // finalize the bookmark
      //
      const archiveEntity = await createArchive({
        client,
        userId,
        bookmarkId: bookmark.id,
        bookmarkTitle: title ?? null,
        url: request?.body?.createArchive?.url ?? url,
        extractionMethod: 'server',
      })
    }
  }
}
