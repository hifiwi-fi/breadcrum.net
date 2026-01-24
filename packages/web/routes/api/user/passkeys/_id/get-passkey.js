import SQL from '@nearform/sql'
import { schemaPasskeyRead } from '../schemas/schema-passkey-read.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { TypePasskeyReadSerialize } from '../schemas/schema-passkey-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getPasskey (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'Get a single passkey',
        description: 'Get details of a specific passkey for the authenticated user',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The passkey ID',
            },
          },
        },
        response: {
          200: schemaPasskeyRead,
          400: { $ref: 'HttpError' },
          404: { $ref: 'HttpError' },
        },
      },
    },
    async function getPasskeyHandler (request, reply) {
      const userId = request.user.id
      const { id } = request.params

      const query = SQL`
        select
          id,
          credential_id,
          name,
          created_at,
          updated_at,
          last_used,
          transports::text[],
          aaguid
        from passkeys
        where id = ${id}
          and user_id = ${userId}
        limit 1
      `

      /** @type {QueryResult<TypePasskeyReadSerialize>} */
      const result = await fastify.pg.query(query)

      if (result.rowCount === 0) {
        return reply.notFound('Passkey not found')
      }

      const passkey = result.rows[0]
      if (!passkey) {
        return reply.notFound('Passkey not found')
      }

      return reply.code(200).send(passkey)
    }
  )
}
