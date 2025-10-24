/**
 * @import { FastifyInstance } from 'fastify'
 * @import PgBoss from '@breadcrum/resources/pgboss/types.js'
 * @import { ResolveBookmarkData } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
 * @import { YTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 * @import { ExtractMetaMeta } from '@breadcrum/extract-meta'
 * @import { ReadabilityParseResult } from '../archives/extract-archive.js'
 * @import { CreatedEpisode } from '@breadcrum/resources/episodes/episode-query-create.js'
 */

import SQL from '@nearform/sql'
import { JSDOM } from 'jsdom'
import { putTagsQuery } from '@breadcrum/resources/tags/put-tags-query.js'
import { createEpisode } from '@breadcrum/resources/episodes/episode-query-create.js'
import { createArchive } from '@breadcrum/resources/archives/archive-query-create.js'
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

import { fetchHTML } from '../archives/fetch-html.js'
import { getSiteMetadata } from '../archives/get-site-metadata.js'
import { extractArchive } from '../archives/extract-archive.js'
import { upcomingCheck } from '../episodes/handle-upcoming.js'
import { finalizeEpisode, finalizeEpisodeError } from '../episodes/finaize-episode.js'
import { finalizeArchive } from '../archives/finalize-archive.js'

/**
 * pg-boss compatible bookmark processor
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {PgBoss.WorkHandler<ResolveBookmarkData>} pg-boss handler
 */
export function makeBookmarkPgBossP ({ fastify }) {
  const logger = fastify.log

  /** @type {PgBoss.WorkHandler<ResolveBookmarkData>} */
  return async function bookmarkPgBossP (jobs) {
    for (const job of jobs) {
      const {
        userId,
        bookmarkId,
        url,
        resolveBookmark,
        resolveArchive,
        resolveEpisode,
        userProvidedMeta,
      } = job.data

      const log = logger.child({ jobId: job.id })
      const pg = fastify.pg

      const jobStartTime = performance.now()
      // Get full job metadata to access retry count
      const jobWithMetadata = await fastify.pgboss.boss.getJobById(job.name, job.id)
      const retryCount = jobWithMetadata?.retryCount || 0

      log.info({ userId, bookmarkId, url, resolveBookmark, resolveArchive, resolveEpisode, userProvidedMeta: Boolean(userProvidedMeta), retryCount }, 'processing bookmark')

      /** workingUrl is the URL to fetch subsequent data with. It is probably normalized but might not be. */
      const workingUrl = new URL(url)

      // We perform the expensive network calls, according to input options
      // and use the results to derive associated assets.

      /** @type { YTDLPMetadata | undefined } */
      let media
      if (resolveEpisode) {
        log.info({ url }, 'resolving episode')
        try {
          media = await getYTDLPMetadata({
            url,
            medium: 'video',
            ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
            attempt: retryCount,
            cache: fastify.ytdlpCache,
          })
        } catch (err) {
          log.warn(err, 'getYTDLPMetadata threw during bookmark resolve')
          log.warn(
            {
              bookmarkId,
              resolveBookmark,
              resolveArchive,
              resolveEpisode,
              userProvidedMeta
            },
            'getYTDLPMetadata threw during bookmark resolve (stats)'
          )
        }
      }

      /** @type { Document | undefined } */
      let document
      if (resolveBookmark || resolveArchive /* TODO: && !youtube */) {
        // TODO: Handle xhtml, pdfs etc.
        log.info({ resolveBookmark, resolveArchive }, 'resolving document')
        const fetchStartTime = performance.now()
        try {
          const html = await fetchHTML({ url: workingUrl })
          const fetchDuration = (performance.now() - fetchStartTime) / 1000
          fastify.otel.httpFetchSeconds.record(fetchDuration)
          fastify.otel.httpFetchSuccessCounter.add(1)

          document = (new JSDOM(html, { url })).window.document
        } catch (err) {
          const fetchDuration = (performance.now() - fetchStartTime) / 1000
          fastify.otel.httpFetchSeconds.record(fetchDuration)
          fastify.otel.httpFetchFailedCounter.add(1)

          log.warn(err, 'Resolving html document failed during bookmark resolve')
          log.warn(
            {
              error: err,
              bookmarkId,
              resolveBookmark,
              resolveArchive,
              resolveEpisode,
              userProvidedMeta
            },
            'Resolving html document failed during bookmark resolve (stats)'
          )
        }
      }

      /** @type {ExtractMetaMeta | undefined} */
      let pageMetadata
      if (resolveBookmark && document) {
        const metadataStartTime = performance.now()
        log.info({ }, 'resolving bookmark with document')
        try {
          pageMetadata = await getSiteMetadata({
            url: workingUrl,
            document,
            media
          })
          const metadataDuration = (performance.now() - metadataStartTime) / 1000
          fastify.otel.siteMetadataSeconds.record(metadataDuration)
          fastify.otel.siteMetadataSuccessCounter.add(1)
        } catch (err) {
          const metadataDuration = (performance.now() - metadataStartTime) / 1000
          fastify.otel.siteMetadataSeconds.record(metadataDuration)
          fastify.otel.siteMetadataFailedCounter.add(1)

          log.warn(err, 'Failed to ExtractMeta during bookmark resolve')
          log.warn(
            {
              bookmarkId,
              resolveBookmark,
              resolveArchive,
              resolveEpisode,
              userProvidedMeta
            },
            'Failed to ExtractMeta during bookmark resolve (stats)'
          )
        }
      }

      /** @type {ReadabilityParseResult | undefined} */
      let article
      if (resolveArchive && document) {
        log.info({ }, 'resolving archive with document')
        try {
          article = await extractArchive({ document })
        } catch (err) {
          log.warn(err, 'Failed to run Readability during bookmark resolve')
          log.warn(
            {
              error: err,
              bookmarkId,
              resolveBookmark,
              resolveArchive,
              resolveEpisode,
              userProvidedMeta
            },
            'Failed to run Readability during bookmark resolve (stats)'
          )
        }
      }

      if (resolveEpisode && media) {
        const mediaUrlFound = media?.url
        const upcomingData = upcomingCheck({ media })
        log.info({ upcomingData, mediaUrlFound }, 'resolving episode')
        /** @type {CreatedEpisode | undefined} */
        let episodeEntity
        try {
          if (upcomingData.isUpcoming || mediaUrlFound) {
            episodeEntity = await createEpisode({
              client: pg,
              userId,
              bookmarkId,
              type: 'redirect',
              medium: 'video',
              url,
            })

            if (upcomingData.isUpcoming) {
              fastify.otel.episodeUpcomingCounter.add(1)
              const releaseTimestampDate = new Date(upcomingData.releaseTimestampMs)

              // Use typed queue wrapper
              const scheduledJobId = await fastify.pgboss.queues.resolveEpisodeQ.send({
                data: {
                  userId,
                  bookmarkTitle: userProvidedMeta.title,
                  episodeId: episodeEntity.id,
                  url,
                  medium: 'video'
                },
                options: {
                  startAfter: releaseTimestampDate
                }
              })

              log.info({
                episodeEntity,
                upcomingData,
                jobId: scheduledJobId,
                releaseTimestamp: releaseTimestampDate.toLocaleString(),
              }, 'Upcoming episode for bookmark scheduled')
            } else if (mediaUrlFound) {
              await finalizeEpisode({
                pg,
                media,
                bookmarkTitle: userProvidedMeta.title,
                episodeId: episodeEntity.id,
                userId,
                url
              })

              log.info(`Episode ${episodeEntity.id} for ${url} is ready.`)
            } else {
              throw new Error('An episode was created without a scheduled time or URL')
            }
          } // else No media, don't do anything
        } catch (err) {
          const handledError = err instanceof Error
            ? err
            : new Error('Unknown episode create error', { cause: err })

          log.error(err, 'Error creating episode on bookmark create')
          log.error({ episodeEntity, error: err }, 'Error creating episode on bookmark create (stats)')
          if (episodeEntity && episodeEntity.id) {
            await finalizeEpisodeError({
              pg,
              error: handledError,
              episodeId: episodeEntity.id,
              userId
            })
          }
        }
      }

      if (resolveBookmark && pageMetadata) {
        log.info({ }, 'resolving metadata')
        // Set the tags
        if (pageMetadata?.tags?.length > 0 && !(userProvidedMeta?.tags?.length > 0)) {
          await putTagsQuery({
            fastify,
            pg,
            userId,
            bookmarkId,
            tags: pageMetadata.tags,
          })
        }

        // Update the rest
        const bookmarkUpdates = []

        bookmarkUpdates.push(SQL`done = true`)

        if (pageMetadata?.title && !userProvidedMeta.title) {
          bookmarkUpdates.push(SQL`title = ${pageMetadata.title}`)
        }

        if (pageMetadata?.summary && !userProvidedMeta.summary) {
          bookmarkUpdates.push(SQL`summary = ${pageMetadata?.summary}`)
        }

        log.debug({ bookmarkUpdates }, 'Bookmark updates')

        if (bookmarkUpdates.length > 0) {
          const bookmarkResolveQuery = SQL`
              update bookmarks
              set ${SQL.glue(bookmarkUpdates, ' , ')}
              where id = ${bookmarkId}
              and owner_id =${userId};
            `
          log.debug({ bookmarkResolveQuery }, 'Bookmark resolve query')

          const bookmarkResolveResult = await pg.query(bookmarkResolveQuery)
          log.debug({ bookmarkResolveResult }, 'Bookmark resolved')
        }

        log.info(`Bookmark ${bookmarkId} for ${url} is ready.`)
      }

      if (resolveArchive && article && article.title && article.content) {
        log.info({ }, 'creating archive')
        const { id: archiveId } = await createArchive({
          client: pg,
          userId,
          bookmarkId,
          bookmarkTitle: article.title,
          url: workingUrl.toString(),
          extractionMethod: 'server',
        })

        await finalizeArchive({
          pg,
          userId,
          archiveId,
          article,
        })
      }

      // Record successful bookmark job completion
      const totalDuration = (performance.now() - jobStartTime) / 1000
      fastify.otel.bookmarkProcessingSeconds.record(totalDuration)
      fastify.otel.bookmarkJobProcessedCounter.add(1)
    }
  }
}
