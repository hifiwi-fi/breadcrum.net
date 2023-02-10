import fp from 'fastify-plugin'
import abstractCacheRedis from 'abstract-cache-redis'
import LRU from 'lru-cache'

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

  // For caching file URLs
  const memURLCache = new LRU({
    max: 10000,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })
  fastify.decorate('memURLCache', memURLCache)

  // For caching url metadata objects
  // TODO: use this
  const memMetaCache = new LRU({
    max: 200,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })
  fastify.decorate('memMetaCache', memMetaCache)
}, {
  name: 'cache',
  dependencies: ['redis']
})
