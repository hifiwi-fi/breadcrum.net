import { getUser } from './user-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaUserRead } from './schemas/schema-user-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *       deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
 * }>}
 */
export async function getUserRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        response: {
          200: /** @type {SchemaUserRead} */(fastify.getSchema('schema:breadcrum:user:read')),
        },
      },
    },
    async function getUserHanlder (request, reply) {
      const userId = request.user.id

      const user = await getUser({ fastify, userId })

      if (user) {
        // TODO refresh token
        reply.status(200)
        return user
      } else {
        return reply.notFound('User not found')
      }
    }
  )
}
