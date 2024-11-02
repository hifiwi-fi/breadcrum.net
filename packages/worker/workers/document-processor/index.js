/**
 * @import { FastifyInstance } from 'fastify'
 * @import { Processor} from 'bullmq'
 */

import SQL from '@nearform/sql'
import { JSDOM } from 'jsdom'
import { fetchHTML } from './fetch-html.js'
import { resolveBookmark } from './resolve-bookmark.js'
import { resolveArchive } from './resolve-archive.js'

/**
 * @param  {object} params
 * @param  {FastifyInstance} params.fastify
 */
export function makeDocumentWorker ({ fastify }) {
  /** @type {Processor<
   * {
    * url: string
    * userId: string
    * resolveMeta: boolean
    * archive: boolean
    * title: string
    * tags: string[]
    * summary: string
    * bookmarkId: string
    * archiveId: string
    * archiveURL: string
   * }
   * >} */
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
      archiveURL,
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
            initialDocument,
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
            initialDocument,
          }))
      }

      const results = await Promise.allSettled(work)
      log.info({ results }, 'document processed')
    } catch (err) {
      log.error(`Error resolving document: Bookmark ${bookmarkId} Archive ${archiveId}`)
      log.error(err)
      const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })
      if (archiveId && userId) {
        const errorQuery = SQL`
          update archives
          set error = ${handledError.stack}, done = true
          where id = ${archiveId}
          and owner_id =${userId};`
        await pg.query(errorQuery)
      }
    }
  }
}
