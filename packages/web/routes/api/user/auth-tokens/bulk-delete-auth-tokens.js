import SQL from '@nearform/sql'
import { schemaBulkDeleteResponse } from './schemas/schema-bulk-delete-response.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function bulkDeleteAuthTokens (fastify, _opts) {
  fastify.delete(
    '/bulk',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Bulk delete auth tokens',
        description: 'Delete all auth tokens that have not been used since a specified date. Cannot delete the current session or protected tokens.',
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            last_seen_before: {
              type: 'string',
              format: 'date-time',
              description: 'Delete tokens that were last seen before this date',
            },
            dry_run: {
              type: 'boolean',
              description: 'If true, shows what would be deleted without actually deleting',
            },
            allow_recent_deletes: {
              type: 'boolean',
              description: 'Required to delete tokens used within the last 7 days',
            },
          },
          required: ['last_seen_before'],
        },
        response: {
          200: schemaBulkDeleteResponse,
          202: schemaBulkDeleteResponse,
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function bulkDeleteAuthTokensHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { last_seen_before: lastSeenBefore, dry_run: dryRun = false, allow_recent_deletes: allowRecentDeletes = false } = request.body

      // Validate the date
      const cutoffDate = new Date(lastSeenBefore)
      if (isNaN(cutoffDate.getTime())) {
        return reply.badRequest('Invalid date format')
      }

      const now = new Date()

      // Prevent deleting tokens with future dates
      if (cutoffDate > now) {
        return reply.badRequest('Cannot delete tokens with a future date')
      }

      // Check if trying to delete recently used tokens (within 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      if (cutoffDate > sevenDaysAgo && !allowRecentDeletes) {
        return reply.badRequest('Attempting to delete recently used tokens. Use allow_recent_deletes=true to confirm.')
      }

      // First, get the tokens that will be deleted (excluding current session and protected tokens)
      const selectQuery = SQL`
        SELECT jti, last_seen
        FROM auth_tokens
        WHERE owner_id = ${userId}
          AND last_seen < ${cutoffDate}
          AND jti != ${currentJti}
          AND protect = FALSE
        ORDER BY last_seen ASC
      `

      const tokensToDelete = await fastify.pg.query(selectQuery)

      if (tokensToDelete.rowCount === 0) {
        const response = {
          deleted_count: 0,
          deleted_tokens: [],
          dry_run: dryRun
        }
        return reply.code(dryRun ? 202 : 200).send(response)
      }

      // If dry run, return what would be deleted without actually deleting
      if (dryRun) {
        return reply.code(202).send({
          deleted_count: tokensToDelete.rowCount ?? 0,
          deleted_tokens: tokensToDelete.rows,
          dry_run: true
        })
      }

      // Delete the tokens (excluding protected ones)
      const deleteQuery = SQL`
        DELETE FROM auth_tokens
        WHERE owner_id = ${userId}
          AND last_seen < ${cutoffDate}
          AND jti != ${currentJti}
          AND protect = FALSE
      `

      const deleteResult = await fastify.pg.query(deleteQuery)

      return reply.code(200).send({
        deleted_count: deleteResult.rowCount,
        deleted_tokens: tokensToDelete.rows,
        dry_run: false
      })
    }
  )
}
