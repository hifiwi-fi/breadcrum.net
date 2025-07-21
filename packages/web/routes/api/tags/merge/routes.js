/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function tagsMergeRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        hide: true, // TODO: remove when implemented
        body: {
          type: 'object',
          properties: {
            source: {
              type: ['array'],
              nullable: true,
              items: {
                type: 'string', minLength: 1, maxLength: 255,
              },
            },
            target: { type: 'string', minLength: 1, maxLength: 255 },
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
