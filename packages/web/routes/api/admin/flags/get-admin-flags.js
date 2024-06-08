import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'

/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsync}
 * @returns {Promise<void>}
 */
export async function getAdminFlags (fastify, opts) {
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
    async function getAdminFlagsHandler (request, reply) {
      const adminFlags = await fastify.getFlags({ frontend: true, backend: true })
      return adminFlags
    }
  )
}
