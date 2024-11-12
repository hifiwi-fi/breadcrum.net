/**
 * @import { FastifyInstance } from 'fastify'
 * @import { ResolveArchiveP } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 */

import SQL from '@nearform/sql'
import { JSDOM } from 'jsdom'
import { fetchHTML } from './fetch-html.js'
import { finalizeArchive } from './finalize-archive.js'
import { extractArchive } from './extract-archive.js'

// The ArchiveP Worker Processor attempts to extract archive content on an un-ready
// Archive row, and set it to ready when completed.

/**
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {ResolveArchiveP}
 */export function makeArchiveP ({ fastify }) {
  /** @type { ResolveArchiveP } */
  async function archiveP (job) {
    const {
      url,
      userId,
      archiveId,
    } = job.data
    const log = fastify.log.child({ jobId: job.id })
    const pg = fastify.pg

    try {
      const html = await fetchHTML({ url: new URL(url) })
      const initialDocument = (new JSDOM(html, { url })).window.document

      const article = await extractArchive({ document: initialDocument })

      const results = await finalizeArchive({
        pg,
        userId,
        archiveId,
        article,
      })

      log.info({ results }, 'document processed')
    } catch (err) {
      const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })

      log.error({ error: handledError, archiveId }, 'Error resolving Archive')

      if (archiveId && userId) {
        const errorQuery = SQL`
          update archives
          set error = ${handledError.stack}, done = true
          where id = ${archiveId}
          and owner_id =${userId};`
        await pg.query(errorQuery)
      }
    }
    return null
  }

  return archiveP
}
