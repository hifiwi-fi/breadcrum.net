import SQL from '@nearform/sql'
import { JSDOM } from 'jsdom'
import { fetchHTML } from './fetch-html.js'
import { resolveBookmark } from './resolve-bookmark.js'
import { resolveArchive } from './resolve-archive.js'

export function makeDocumentWorker ({ fastify }) {
  return async function documentWorker (job) {
    const {
      url,
      userId,
      resolveMeta,
      archive,
      title,
      tags,
      summary,
      bookmarkId,
      archiveId,
      archiveURL
    } = job.data
    const log = fastify.log.child({ jobId: job.id })
    const pg = fastify.pg

    try {
      const html = await fetchHTML({ url, fastify })
      const initialDocument = (new JSDOM(html, { url })).window.document

      const work = []
      if (resolveMeta) {
        log.info('resolving meta')
        work.push(
          resolveBookmark({
            fastify,
            log,
            userId,
            bookmarkId,
            url,
            title,
            tags,
            summary,
            initialDocument
          })
        )
      }

      if (archive) {
        log.info('resolving archive')
        work.push(
          resolveArchive({
            fastify,
            log,
            userId,
            archiveId,
            url: archiveURL,
            initialDocument
          }))
      }

      const results = await Promise.allSettled(work)
      log.info({ results }, 'document processed')
    } catch (err) {
      log.error(`Error resolving document: Bookmark ${bookmarkId} Archive ${archiveId}`)
      log.error(err)
      if (archiveId && userId) {
        const errorQuery = SQL`
          update archives
          set error = ${err.stack}, done = true
          where id = ${archiveId}
          and owner_id =${userId};`
        await pg.query(errorQuery)
      }
    }
  }
}
