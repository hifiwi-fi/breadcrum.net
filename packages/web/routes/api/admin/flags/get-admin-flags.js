import { defaultAdminFlags, getAdminFlagValues } from './flag-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getAdminFlags (fastify) {
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
        response: {
          200: {
            type: 'object',
            properties: {
              ...defaultAdminFlags,
            },
          },
        },
      },
    },
    // Get admin flags
    async function getAdminFlagsHandler (_request, _reply) {
      return getAdminFlagValues(fastify)
    }
  )
}
