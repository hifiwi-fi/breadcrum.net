import { defaultFrontendFlags } from '../../../../plugins/flags/frontend-flags.js'
import { defaultBackendFlags } from '../../../../plugins/flags/backend-flags.js'

// admin/flags route returns frontand and backend flags and requires admin to see
export async function getAdminFlags (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin
      ], {
        relation: 'and'
      }),
      schema: {
        hide: true,
        response: {
          200: {
            type: 'object',
            properties: {
              ...defaultFrontendFlags,
              ...defaultBackendFlags
            }
          }
        }
      }
    },
    // Get admin flags
    async function getAdminFlagsHandler (request, reply) {
      const adminFlags = await fastify.getFlags({ frontend: true, backend: true })
      return adminFlags
    }
  )
}
