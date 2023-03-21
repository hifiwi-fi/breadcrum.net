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
    if ('title' in article) archiveData.push(SQL`title = ${article.title}`)
    if ('siteName' in article) archiveData.push(SQL`site_name = ${article.siteName}`)
    if ('content' in article) archiveData.push(SQL`html_content = ${article.content}`)
    if ('length' in article) archiveData.push(SQL`length = ${article.length}`)
    if ('excerpt' in article) archiveData.push(SQL`excerpt = ${article.excerpt}`)
    if ('byline' in article) archiveData.push(SQL`byline = ${article.byline}`)
    if ('dir' in article) archiveData.push(SQL`direction = ${article.dir}`)
    if ('lang' in article) archiveData.push(SQL`language = ${article.lang}`)

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
