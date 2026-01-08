import { schemaAdminUserRead } from '../schemas/schema-admin-user-read.js'
import { getAdminUser } from '../get-admin-users-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { ExtractResponseType } from '../../../../../types/fastify-utils.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *    }
 * }>}
 */
export async function getAdminUserRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: schemaAdminUserRead
        },
      },
    },
    // GET user with administrative fields
    async function getAdminUserHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      const { id: userId } = request.params

      const user = await getAdminUser({
        fastify,
        userId,
      })

      if (!user) {
        return reply.notFound('user id not found')
      }

      /** @type{ReturnBody} */
      const body = user

      return reply.code(200).send(body)
    }
  )
}
