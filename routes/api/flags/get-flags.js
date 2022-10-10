import { defaultFrontendFlags } from '../../../plugins/flags/frontend-flags.js'

export async function getFlags (fastify, opts) {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              ...defaultFrontendFlags
            }
          }
        }
      }
    },
    // Get flags
    async function getFlagsHandler (request, reply) {
      const frontendFlags = await fastify.getFlags({ frontend: true, backend: false })
      return frontendFlags
    }
  )
}
