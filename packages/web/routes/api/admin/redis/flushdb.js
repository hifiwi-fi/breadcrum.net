/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

import { flushRedisCache } from './redis-actions.js'

/**
 * Flushes all keys in the Redis cache database.
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function flushCache (fastify) {
  fastify.post(
    '/flush-cache',
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
              status: { type: 'string' },
              cleared: { type: 'boolean' },
            },
          },
        },
      },
    },
    async function flushCacheHandler (_request, _reply) {
      return flushRedisCache(fastify)
    }
  )
}
