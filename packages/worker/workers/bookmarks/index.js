/**
 * @import { FastifyInstance } from 'fastify'
 * @import { ResolveBookmarkP } from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
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
import { resolveEpisodeJobName } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
// import { resolveType } from '@breadcrum/resources/episodes/resolve-type.js'

import { fetchHTML } from '../archives/fetch-html.js'
import { getSiteMetadata } from '../archives/get-site-metadata.js'
import { extractArchive } from '../archives/extract-archive.js'
import { upcomingCheck } from '../episodes/handle-upcoming.js'
import { finalizeEpisode, finalizeEpisodeError } from '../episodes/finaize-episode.js'
import { finalizeArchive } from '../archives/finalize-archive.js'
// import { isYouTubeUrl } from '@bret/is-youtube-url'

/**
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {ResolveBookmarkP}
 */
export function makeBookmarkP ({ fastify }) {
  /** @type {ResolveBookmarkP} */
  async function bookmarkP (job) {
    const {
      userId,
      bookmarkId,
      url,
      resolveBookmark,
      resolveArchive,
      resolveEpisode,
      userProvidedMeta,
    } = job.data

    const log = fastify.log.child({ jobId: job.id })
    const pg = fastify.pg

    /** workingUrl is the URL to fetch subsequent data with. It is probably normalized but might not be. */
    const workingUrl = new URL(url)

    // We perform the expensive network calls, according to input options
    // and use the results to derive associated assets.

    /** @type { YTDLPMetadata | undefined } */
    let media
    if (resolveEpisode) {
      try {
        media = await getYTDLPMetadata({
          url,
          medium: 'video',
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          attempt: job.attemptsMade,
          cache: fastify.ytdlpCache,
        })
      } catch (err) {
        log.warn(
          {
            error: err,
            bookmarkId,
            resolveBookmark,
            resolveArchive,
            resolveEpisode,
            userProvidedMeta
          },
          'getYTDLPMetadata threw during bookmark resolve'
        )
      }
    }

    /** @type { Document | undefined } */
    let document
    if (resolveBookmark || resolveArchive /* TODO: && !youtube */) {
      // TODO: Handle xhtml, pdfs etc.
      try {
        const html = await fetchHTML({ url: workingUrl })
        document = (new JSDOM(html, { url })).window.document
      } catch (err) {
        log.warn(
          {
            error: err,
            bookmarkId,
            resolveBookmark,
            resolveArchive,
            resolveEpisode,
            userProvidedMeta
          },
          'Resolving html document failed during bookmark resolve'
        )
      }
    }

    /** @type {ExtractMetaMeta | undefined} */
    let pageMetadata
    if (resolveBookmark && document) {
      try {
        pageMetadata = await getSiteMetadata({
          url: workingUrl,
          document,
          media
        })
      } catch (err) {
        log.warn(
          {
            error: err,
            bookmarkId,
            resolveBookmark,
            resolveArchive,
            resolveEpisode,
            userProvidedMeta
          },
          'Failed to ExtractMeta during bookmark resolve'
        )
      }
    }

    /** @type {ReadabilityParseResult | undefined} */
    let article
    if (resolveArchive && document) {
      try {
        article = await extractArchive({ document })
      } catch (err) {
        log.warn(
          {
            error: err,
            bookmarkId,
            resolveBookmark,
            resolveArchive,
            resolveEpisode,
            userProvidedMeta
          },
          'Failed to run Readability during bookmark resolve'
        )
      }
    }

    // log.debug({ url, html }, 'Fetched HTML')

    if (resolveEpisode && media) {
      const mediaUrlFound = media?.url
      const upcomingData = upcomingCheck({ media })
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
            const scheduledEpisodeJob = await fastify.queues.resolveEpisodeQ.add(
              resolveEpisodeJobName,
              {
                userId,
                bookmarkTitle: userProvidedMeta.title,
                episodeId: episodeEntity.id,
                url,
                // TODO: should clarify this default
                medium: 'video'
              },
              {
                delay: upcomingData.jobDelayMs
              }
            )

            const releaseTimestampDate = new Date(upcomingData.releaseTimestampMs)
            const jobDelayDate = new Date(upcomingData.jobDelayMs)

            log.info({
              episodeEntity,
              upcomingData,
              jobId: scheduledEpisodeJob.id,
              releaseTimestamp: releaseTimestampDate.toLocaleString(),
              jobDelay: jobDelayDate.toLocaleString(),
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

        log.error({ episodeEntity, error: err }, 'Error creating episode on bookmark create')
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

    return null
  }

  return bookmarkP
}
