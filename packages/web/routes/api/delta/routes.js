/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
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
