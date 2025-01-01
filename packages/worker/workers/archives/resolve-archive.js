/**
 * @import {FastifyInstance} from 'fastify'
 */

import SQL from '@nearform/sql'
import { extractArchive } from './extract-archive.js'

/**
 * @param  {object} params
 * @param  {FastifyInstance} params.fastify
 * @param  {FastifyInstance['log']} params.log
 * @param  {string} params.userId
 * @param  {string} params.archiveId
 * @param  {string} params.url
 * @param  {Document} params.initialDocument
 */
export async function resolveArchive ({
  fastify,
  log,
  userId,
  archiveId,
  url,
  initialDocument,
}) {
  const pg = fastify.pg
  log = log ?? fastify.log

  try {
    const article = await extractArchive({ document: initialDocument })

    const archiveData = []

    archiveData.push(SQL`done = true`)

    if (article) {
      if (article.title != null) archiveData.push(SQL`title = ${article.title}`)
      if (article.siteName != null) archiveData.push(SQL`site_name = ${article.siteName}`)
      if (article.content != null) archiveData.push(SQL`html_content = ${article.content}`)
      if (article.textContent != null) archiveData.push(SQL`text_content = ${article.textContent}`)
      if (article.length != null) archiveData.push(SQL`length = ${article.length}`)
      if (article.excerpt != null) archiveData.push(SQL`excerpt = ${article.excerpt}`)
      if (article.byline != null) archiveData.push(SQL`byline = ${article.byline}`)
      if (article.dir != null) archiveData.push(SQL`direction = ${article.dir}`)
      if (article.lang != null) archiveData.push(SQL`language = ${article.lang}`)
    }

    const query = SQL`
        update archives
        set ${SQL.glue(archiveData, ' , ')}
        where id = ${archiveId}
        and owner_id =${userId};
      `

    const archiveResult = await pg.query(query)
    archiveResult.rows.pop()

    log.info(`Archive ${archiveId} for ${url} is done.`)
  } catch (err) {
    log.error(`Error resolving archive ${archiveId}`)
    log.error(err)
    const handledError = err instanceof Error ? err : new Error('Unkown error type', { cause: err })
    const errorQuery = SQL`
        update archives
        set error = ${handledError.stack}, done = true
        where id = ${archiveId}
        and owner_id =${userId};`
    await pg.query(errorQuery)
  }
}
