/**
 * @import { ReadabilityParseResult } from './extract-archive.js'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'

/**
 * @param  {object} params
 * @param  {PgClient} params.pg
 * @param  {string} params.userId
 * @param  {string} params.archiveId
 * @param  {ReadabilityParseResult} params.article
 */
export async function finalizeArchive ({
  pg,
  userId,
  archiveId,
  article,
}) {
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
    if (article.publishedTime != null) archiveData.push(SQL`published_time = ${article.publishedTime}`)
  }

  const query = SQL`
        update archives
        set ${SQL.glue(archiveData, ' , ')}
        where id = ${archiveId}
        and owner_id =${userId};
      `

  await pg.query(query)
}
