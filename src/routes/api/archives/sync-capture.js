import SQL from '@nearform/sql'
import { createArchive } from '#resources/archives/archive-query-create.js'
import { normalizeURL } from '#resources/bookmarks/normalize-url.js'

/**
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { PoolClient, QueryResult } from 'pg'
 * @import { ArchiveSyncReceipt } from './schemas/schema-archive-sync-receipt.js'
 */

/**
 * @param {PoolClient} client
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {string} bookmarkId
 * @param {string} operationId
 * @param {string | undefined} archiveURL
 * @param {boolean} normalize
 * @returns {Promise<ArchiveSyncReceipt>}
 */
export async function syncArchiveCapture (client, fastify, request, bookmarkId, operationId, archiveURL, normalize) {
  const ownerId = request.user.id
  /** @type {QueryResult<{url: string, title: string | null}>} */
  const result = await client.query(SQL`
    select url, title from bookmarks
    where id = ${bookmarkId} and owner_id = ${ownerId}
    for key share
  `)
  const bookmark = result.rows[0]
  if (!bookmark) {
    return { operation_id: operationId, bookmark_id: bookmarkId, archive_id: null, outcome: 'bookmark_missing' }
  }

  let url = archiveURL ?? bookmark.url
  if (archiveURL && normalize) {
    try {
      url = (await normalizeURL(new URL(archiveURL), { cache: fastify.cache, logger: request.log })).toString()
    } catch {
      throw fastify.httpErrors.badRequest('Invalid archive URL format')
    }
  }

  const archive = await createArchive({
    client,
    userId: ownerId,
    bookmarkId,
    bookmarkTitle: bookmark.title ?? bookmark.url,
    extractionMethod: 'server',
    url,
  })
  const job = await fastify.pgboss.queues.resolveArchiveQ.send({
    data: { url: archive.url, userId: ownerId, archiveId: archive.id, parentRequestId: request.id },
    options: { db: { executeSql: (sql, values) => client.query(sql, values) } },
  })
  if (!job) throw fastify.httpErrors.serviceUnavailable('Could not enqueue archive capture.')
  return { operation_id: operationId, bookmark_id: bookmarkId, archive_id: archive.id, outcome: 'archive_created' }
}
