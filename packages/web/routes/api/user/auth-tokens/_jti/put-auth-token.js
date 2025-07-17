import SQL from '@nearform/sql'
import { schemaAuthTokenRead } from '../schemas/schema-auth-token-read.js'
import { getSingleAuthToken } from './get-single-auth-token-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function putAuthToken (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'Update an auth token',
        description: 'Update the note field and/or protect status of a specific auth token (session) for the authenticated user',
        params: {
          type: 'object',
          properties: {
            jti: {
              type: 'string',
              format: 'uuid',
              description: 'The JWT ID of the token to update',
            },
          },
          required: ['jti'],
        },
        body: {
          type: 'object',
          properties: {
            note: {
              type: ['string', 'null'],
              maxLength: 255,
              description: 'A note to identify the session (e.g., "Work laptop", "Home PC")',
            },
            protect: {
              type: 'boolean',
              description: 'When true, prevents the token from being bulk deleted',
            },
          },
          additionalProperties: false,
        },
        response: {
          200: schemaAuthTokenRead,
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function putAuthTokenHandler (request, reply) {
      const { id: userId, jti: currentJti } = request.user
      const { jti } = request.params
      const { note, protect } = request.body

      // Check if token exists and belongs to user
      const checkQuery = SQL`
        SELECT jti
        FROM auth_tokens
        WHERE jti = ${jti}
          AND owner_id = ${userId}
      `

      const checkResult = await fastify.pg.query(checkQuery)

      if (checkResult.rowCount === 0) {
        return reply.notFound('Auth token not found')
      }

      // Build update fields dynamically
      const updateFields = []
      if (note !== undefined) {
        updateFields.push(SQL`note = ${note}`)
      }
      if (protect !== undefined) {
        updateFields.push(SQL`protect = ${protect}`)
      }

      if (updateFields.length === 0) {
        return reply.badRequest('No fields to update')
      }

      // Update the note and/or protect status
      const updateQuery = SQL`
        UPDATE auth_tokens
        SET ${SQL.glue(updateFields, ', ')}
        WHERE jti = ${jti}
          AND owner_id = ${userId}
      `

      await fastify.pg.query(updateQuery)

      // Return the updated token
      const updatedToken = await getSingleAuthToken({
        fastify,
        userId,
        jti,
        currentJti,
      })

      if (!updatedToken) {
        throw new Error('Failed to retrieve updated token')
      }

      return reply.code(200).send(updatedToken)
    }
  )
}
