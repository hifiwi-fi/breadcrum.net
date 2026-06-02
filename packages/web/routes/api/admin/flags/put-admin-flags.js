import { defaultAdminFlags, updateAdminFlagValues } from './flag-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function putAdminFlags (fastify, _opts) {
  fastify.put(
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
        body: {
          type: 'object',
          properties: defaultAdminFlags,
          additionalProperties: false,
          minProperties: 1,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              updateCount: {
                type: 'integer',
              },
              deleteCount: {
                type: 'integer',
              },
            },
          },
        },
      },
    },
    // Get flags
    async function putAdminFlagsHandler (request, _reply) {
      return updateAdminFlagValues(fastify, /** @type {Record<string, unknown>} */ (request.body))
    }
  )
}
