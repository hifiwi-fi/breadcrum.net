/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function configRoutes (fastify, _opts) {
  fastify.get(
    '/',
    {
      schema: {
        hide: true,
        response: {
          200: {
            type: 'object',
            properties: {
              turnstile_sitekey: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    async function getConfigHandler (_request, reply) {
      reply.header('cache-control', 'no-store')
      const sitekey = fastify.config.TURNSTILE_SITEKEY ?? ''
      return {
        turnstile_sitekey: sitekey,
      }
    }
  )
}
