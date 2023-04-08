import SQL from '@nearform/sql'

export async function resolveArchive ({
  fastify,
  pg, // optional tx client
  log, // optional request logging instance
  userID,
  bookmarkTitle,
  archiveID,
  url,
  initialHTML
}) {
  pg = pg ?? fastify.pg
  log = log ?? fastify.log

  try {
    const article = await fastify.extractArchive({
      url,
      initialHTML
    })

    // log.info({ article })

    const archiveData = []

    archiveData.push(SQL`ready = true`)
    archiveData.push(SQL`url = ${url}`)

    console.dir({ article }, { depth: 999 })
    if (article.title != null) archiveData.push(SQL`title = ${article.title}`)
    if (article.siteName != null) archiveData.push(SQL`site_name = ${article.siteName}`)
    if (article.content != null) archiveData.push(SQL`html_content = ${article.content}`)
    if (article.textContent != null) archiveData.push(SQL`text_content = ${article.textContent}`)
    if (article.length != null) archiveData.push(SQL`length = ${article.length}`)
    if (article.excerpt != null) archiveData.push(SQL`excerpt = ${article.excerpt}`)
    if (article.byline != null) archiveData.push(SQL`byline = ${article.byline}`)
    if (article.dir != null) archiveData.push(SQL`direction = ${article.dir}`)
    if (article.lang != null) archiveData.push(SQL`language = ${article.lang}`)

    const query = SQL`
        update archives
        set ${SQL.glue(archiveData, ' , ')}
        where id = ${archiveID}
        and owner_id =${userID};
      `

    const archiveResult = await pg.query(query)
    archiveResult.rows.pop()

    log.info(`Archive ${archiveID} for ${url} is ready.`)
  } catch (err) {
    log.error(`Error resolving archive ${archiveID}`)
    log.error(err)
    const errorQuery = SQL`
        update archives
        set error = ${err.stack}
        where id = ${archiveID}
        and owner_id =${userID};`
    await pg.query(errorQuery)
  }
}
