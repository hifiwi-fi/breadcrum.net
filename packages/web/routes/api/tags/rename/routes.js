// import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function tagsRenameRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        hide: true,
        body: {
          type: 'object',
          properties: {
            old: { type: 'string', minLength: 1, maxLength: 255 },
            new: { type: 'string', minLength: 1, maxLength: 255 },
          },
          required: ['name'],
        },
      },
    },
    async function (_request, reply) {
      return reply.notImplemented()
    }
  )
}
