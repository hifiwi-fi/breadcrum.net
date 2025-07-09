/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function deltaRoutes (fastify, _opts) {
  fastify.get(
    '/last_update',
    {
      schema: {
        hide: true, // TODO: remove when implemented
      },
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )

  fastify.get(
    '/bookmarks',
    {
      schema: {
        hide: true, // TODO: remove when implemented
      },
    },
    async function (request, reply) {
      return reply.notImplemented()
    }
  )
}
