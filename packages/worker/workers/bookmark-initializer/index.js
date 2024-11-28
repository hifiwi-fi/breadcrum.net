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
import { normalizeURL as normalize } from '@breadcrum/resources/bookmarks/normalize-url.js'
import { isYouTubeUrl } from '@bret/is-youtube-url'
import { putTagsQuery } from '@breadcrum/resources/tags/put-tags-query.js'

/**
 * @param  {object} params
 * @param  {FastifyInstance} params.fastify
 */
export function makeBookmarkInitializerWorker ({ fastify }) {
  /** @type {Processor<
   * {
    * userId: string
    * bookmarkId: string
    * url: string
    * resolveBookmark: boolean
    * resolveArchive: boolean
    * normalizeURL: boolean
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
      userId,
      bookmarkId,
      url,
      resolveBookmark,
      resolveArchive,
      resolveEpisode,
      normalizeURL,
      userProvidedMeta,
    } = job.data
    const log = fastify.log.child({ jobId: job.id })
    const pg = fastify.pg

    const originalUrl = new URL(url)

    /** workingUrl is the URL to fetch subsequent data with. It is probably normalized but might not be. */
    let workingUrl = originalUrl

    if (normalizeURL) {
      const normalizedUrl = await normalize(url)
      workingUrl = normalizedUrl

      const updates = [
        SQL`url = ${normalizedUrl.toString()}`,
        SQL`original_url = ${originalUrl.toString()}`
      ]

      const normalizeUrlQuery = SQL`
        update bookmarks
        set ${SQL.glue(updates, ' , ')}
        where id = ${bookmarkId}
        and owner_id = ${userId};
      `

      const normalizeUrlQueryResult = await pg.query(normalizeUrlQuery)
      log.debug({ normalizeUrlQueryResult }, 'Normalized URL')
    }

    const html = await fetchHTML({ url: workingUrl })
    const initialDocument = (new JSDOM(html, { url: workingUrl.toString() })).window.document
    log.debug({ url, html }, 'Fetched HTML')

    const mediaMetadata = await getYTDLPMetadata({
      url,
      medium: 'video',
      ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
      attempt: job.attemptsMade,
      cache: fastify.ytdlpCache,
    })

    if (resolveBookmark) {
      /** The simplified metadata extraction that also runs in the bookmarkelt. */
      const pageMetadata = await getSiteMetadata({
        document: initialDocument,
      })

      const bookmarkUpdates = []

      bookmarkUpdates.push(SQL`done = true`)

      if (pageMetadata?.title && userProvidedMeta.title === originalUrl.toString()) {
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

      if (pageMetadata?.tags?.length > 0 && !(userProvidedMeta?.tags?.length > 0)) {
        await putTagsQuery({
          fastify,
          pg,
          userId,
          bookmarkId,
          tags: pageMetadata.tags,
        })
      }
      log.info(`Bookmark ${bookmarkId} for ${url} is ready.`)
    }

    if (resolveArchive) {
      const article = await extractArchive({ document: initialDocument })

      const archiveData = []
    }
  }
}
