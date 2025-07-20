import { defaultFrontendFlags } from '../../../plugins/flags/frontend-flags.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getFlags (fastify, _opts) {
  fastify.get(
    '/',
    {
      schema: {
        hide: true,
        response: {
          200: {
            type: 'object',
            properties: {
              ...defaultFrontendFlags,
            },
          },
        },
      },
    },
    // Get flags
    async function getFlagsHandler (_request, _reply) {
      const frontendFlags = await fastify.getFlags({ frontend: true, backend: false })
      return frontendFlags
    }
  )
}
