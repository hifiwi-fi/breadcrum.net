import SQL from '@nearform/sql'
import { syncReceiptHeaders, withSyncReceipt } from '#resources/sync/sync-receipt.js'
import { archiveSyncReceipt } from '../schemas/schema-archive-sync-receipt.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ArchiveSyncReceipt } from '../schemas/schema-archive-sync-receipt.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function deleteArchiveRoute (fastify, _opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      tags: ['archives'],
      description: 'Delete an archive.',
      headers: syncReceiptHeaders,
      params: {
        type: 'object',
        properties: {
          archive_id: { type: 'string', format: 'uuid' },
        },
        required: ['archive_id'],
      },
      response: {
        200: {
          type: 'object',
          required: ['sync'],
          properties: { sync: archiveSyncReceipt },
        },
        409: { $ref: 'HttpError' },
        202: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['ok'] },
          },
          required: ['status'],
        },
        404: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: ['error'] },
            message: { type: 'string' },
          },
          required: ['status', 'message'],
        },
      },
    },
  },
  async function deleteArchiveHandler (request, reply) {
    const ownerId = request.user.id
    const archiveId = request.params.archive_id.toLowerCase()

    const query = SQL`
      delete from archives
      where id = ${archiveId}
        and owner_id = ${ownerId}
    `

    const operationId = request.headers['idempotency-key']
    if (operationId) {
      reply.header('Cache-Control', 'private, no-store')
      let deleted = false
      const sync = await fastify.pg.transact(client => withSyncReceipt(
        client, fastify.httpErrors, ownerId, operationId, ['archive_delete', archiveId],
        /** @returns {Promise<ArchiveSyncReceipt>} */
        async id => {
          /** @type {QueryResult<{bookmark_id: string}>} */
          const result = await client.query(SQL`${query} returning bookmark_id`)
          const bookmarkId = result.rows[0]?.bookmark_id ?? null
          deleted = bookmarkId !== null
          return {
            operation_id: id,
            archive_id: archiveId,
            bookmark_id: bookmarkId,
            outcome: deleted ? 'archive_deleted' : 'archive_missing',
          }
        }
      ))
      if (deleted) fastify.otel.archiveDeleteCounter.add(1)
      return reply.code(200).send({ sync })
    }

    const result = await fastify.pg.query(query)

    if (result.rowCount === 0) {
      return reply.status(404).send(/** @type {const} */({
        status: 'error',
        message: 'Archive not found or you do not have permission to delete it',
      }))
    }

    reply.status(202)
    fastify.otel.episodeDeleteCounter.add(1)

    return /** @type {const} */({
      status: 'ok',
    })
  })
}
