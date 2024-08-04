/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function putArchives (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        tags: ['archives'],
        querystring: {},
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  $ref: 'schema:breadcrum:archive-with-bookmark:read',
                },
              },
            },
          },
        },
      },
    },
    async function putArchivesHandler (_request, reply) {
      return reply.notImplemented()
    }
  )
}
