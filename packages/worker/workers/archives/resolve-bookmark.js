/**
 * @import {FastifyInstance} from 'fastify'
 */

import SQL from '@nearform/sql'
import { putTagsQuery } from '@breadcrum/resources/tags/put-tags-query.js'
import { getSiteMetadata } from './get-site-metadata.js'

/**
 * @param  {object} params
 * @param  {FastifyInstance} params.fastify
 * @param  {FastifyInstance['log']} params.log
 * @param  {string} params.userId
 * @param  {string} params.bookmarkId
 * @param  {string} params.title
 * @param  {string[]} params.tags
 * @param  {string} params.summary
 * @param  {string} params.url
 * @param  {Document} params.initialDocument
 */
export async function resolveBookmark ({
  fastify,
  log,
  userId,
  bookmarkId,
  url,
  title,
  tags,
  summary,
  initialDocument,
}) {
  const pg = fastify.pg
  log = log ?? fastify.log

  try {
    const metadata = await getSiteMetadata({
      document: initialDocument,
    })

    log.info({ metadata, bookmarkId, url, title, tags, summary })

    const bookmarkData = []

    bookmarkData.push(SQL`done = true`)

    if (metadata?.title && title === url) bookmarkData.push(SQL`title = ${metadata?.title}`)
    if (metadata?.summary && !summary) bookmarkData.push(SQL`summary = ${metadata?.summary}`)
    log.info({ bookmarkData })
    const query = SQL`
        update bookmarks
        set ${SQL.glue(bookmarkData, ' , ')}
        where id = ${bookmarkId}
        and owner_id =${userId};
      `

    log.info({ query })

    const bookmarkResult = await pg.query(query)
    bookmarkResult.rows.pop()

    if (metadata?.tags?.length > 0 && !(tags?.length > 0)) {
      await putTagsQuery({
        fastify,
        pg,
        userId,
        bookmarkId,
        tags: metadata.tags,
      })
    }

    log.info(`Bookmark ${bookmarkId} for ${url} is ready.`)
  } catch (err) {
    log.error(`Error resolving bookmark ${bookmarkId}`)
    log.error(err)
    const handledError = err instanceof Error ? err : new Error('Unknown error type', { cause: err })
    const errorQuery = SQL`
        update bookmarks
        set error = ${handledError.stack}, done = true
        where id = ${bookmarkId}
        and owner_id =${bookmarkId};`
    log.error({ errorQuery })
    await pg.query(errorQuery)
  }
}
