/**
 * @import { FastifyInstance } from 'fastify'
 * @import {WorkHandler} from '@breadcrum/resources/pgboss/types.js'
 * @import { ResolveArchiveData } from '@breadcrum/resources/archives/resolve-archive-queue.js'
 */

import SQL from '@nearform/sql'
import { createDocumentFromHtml } from '@breadcrum/resources/archives/create-document-from-html.js'
import { fetchHTML } from './fetch-html.js'
import { finalizeArchive } from './finalize-archive.js'
import { extractArchive } from './extract-archive.js'

// The ArchiveP Worker Processor attempts to extract archive content on an un-ready
// Archive row, and set it to ready when completed.

/**
 * pg-boss compatible archive processor
 * @param {object} params
 * @param  { FastifyInstance } params.fastify
 * @return {WorkHandler<ResolveArchiveData>} pg-boss handler
 */
export function makeArchivePgBossP ({ fastify }) {
  const logger = fastify.log

  /** @type {WorkHandler<ResolveArchiveData>} */
  return async function archivePgBossP (jobs) {
    for (const job of jobs) {
      const {
        url,
        userId,
        archiveId,
      } = job.data
      const log = logger.child({ jobId: job.id })
      const pg = fastify.pg

      const jobStartTime = performance.now()

      try {
        log.info({ url, userId, archiveId }, 'processing document')
        const fetchStartTime = performance.now()
        const html = await fetchHTML({ url: new URL(url) })
        const fetchDuration = (performance.now() - fetchStartTime) / 1000
        fastify.otel.archiveFetchSeconds.record(fetchDuration)

        const initialDocument = createDocumentFromHtml({ html, url })

        const extractionStartTime = performance.now()
        const article = await extractArchive({ document: initialDocument })
        const extractionDuration = (performance.now() - extractionStartTime) / 1000
        fastify.otel.archiveExtractionSeconds.record(extractionDuration)

        const results = await finalizeArchive({
          pg,
          userId,
          archiveId,
          article,
        })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.archiveProcessingSeconds.record(totalDuration)
        fastify.otel.archiveJobProcessedCounter.add(1)

        log.info({ results }, 'document processed')
      } catch (err) {
        const handledError = err instanceof Error ? err : new Error('Unknown error', { cause: err })

        const totalDuration = (performance.now() - jobStartTime) / 1000
        fastify.otel.archiveProcessingSeconds.record(totalDuration)
        fastify.otel.archiveJobFailedCounter.add(1)

        log.error(handledError, 'Error resolving Archive')

        if (archiveId && userId) {
          const errorQuery = SQL`
            update archives
            set error = ${handledError.stack}, done = true
            where id = ${archiveId}
            and owner_id =${userId};`
          await pg.query(errorQuery)
        }
        // Accept the failure - don't throw to avoid pg-boss retries
        // The error has already been logged and stored in the database
      }
    }
  }
}
