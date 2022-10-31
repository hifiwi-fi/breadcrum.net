import fp from 'fastify-plugin'
import abstractCacheRedis from 'abstract-cache-redis'

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, opts) {
  const client = abstractCacheRedis({ client: fastify.redis })

  fastify.register(import('@fastify/caching'), {
    client
  })
}, {
  name: 'cache',
  dependencies: ['redis']
})
