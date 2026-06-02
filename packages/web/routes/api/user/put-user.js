import { updateUser } from './user-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaUserUpdate } from './schemas/schema-user-update.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *    SerializerSchemaOptions: {
 *       deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }
 * }>}
 */
export async function putUserRoute (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        body: /** @type {SchemaUserUpdate} */(fastify.getSchema('schema:breadcrum:user:update')),
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['ok'] },
            },
          },
        },
      },
    },
    async function putUserHandler (request, reply) {
      const result = await updateUser(fastify, {
        userId: request.user.id,
        user: request.body,
      })

      if (!result.ok) {
        return reply.conflict(result.message)
      }

      return /** @type {const} */ ({
        status: 'ok',
      })
    }
  )
}
