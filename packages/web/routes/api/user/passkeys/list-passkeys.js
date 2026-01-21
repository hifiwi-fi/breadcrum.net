import SQL from '@nearform/sql'
import { schemaPasskeyRead } from './schemas/schema-passkey-read.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { TypePasskeyReadSerialize } from './schemas/schema-passkey-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function listPasskeys (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'List passkeys for the current user',
        description: 'Get a list of all registered passkeys for the authenticated user (max 10, no pagination)',
        response: {
          200: {
            type: 'array',
            items: schemaPasskeyRead,
          },
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function listPasskeysHandler (request, reply) {
      const userId = request.user.id

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
        where user_id = ${userId}
        order by created_at desc
      `

      /** @type {QueryResult<TypePasskeyReadSerialize>} */
      const result = await fastify.pg.query(query)

      return reply.code(200).send(result.rows)
    }
  )
}
