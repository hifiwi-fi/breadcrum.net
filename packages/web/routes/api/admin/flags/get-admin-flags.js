import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
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
              ...defaultFrontendFlags,
              ...defaultBackendFlags,
            },
          },
        },
      },
    },
    // Get admin flags
    async function getAdminFlagsHandler (_request, _reply) {
      const adminFlags = await fastify.getFlags({ frontend: true, backend: true })
      return adminFlags
    }
  )
}
