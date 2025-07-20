/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
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
                  $ref: 'schema:breadcrum:archive:read',
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
