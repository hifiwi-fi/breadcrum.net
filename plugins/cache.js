import fp from 'fastify-plugin'
import abstractCacheRedis from 'abstract-cache-redis'
import LRU from 'lru-cache'
import assert from 'webassert'

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

  function getFileKey ({
    userId,
    episodeId,
    sourceUrl,
    type,
    medium
  }) {
    assert(userId, 'userId required')
    assert(episodeId, 'episodeId required')
    assert(sourceUrl, 'sourceUrl required')
    assert(type, 'type required')
    assert(medium, 'medium required')
    return [
      'file',
      userId,
      episodeId,
      sourceUrl,
      type,
      medium
    ].join(':')
  }

  fastify.decorate('memURLCache', {
    get ({ userId, episodeId, sourceUrl, type, medium } = {}) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      return memURLCache.get(key)
    },
    set ({ userId, episodeId, sourceUrl, type, medium } = {}, value) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      return memURLCache.set(key, value)
    },
    raw: memURLCache
  })

  // For caching url metadata objects
  const memMetaCache = new LRU({
    max: 200,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })

  function getMetaKey ({
    url,
    medium
  }) {
    assert(url, 'url required')
    assert(medium, 'medium required')
    return [
      'meta',
      url,
      medium
    ].join(':')
  }

  fastify.decorate('memMetaCache', {
    get ({ url, medium } = {}) {
      const key = getMetaKey({ url, medium })
      return memMetaCache.get(key)
    },
    set ({ url, medium } = {}, value) {
      const key = getMetaKey({ url, medium })
      return memMetaCache.set(key, value)
    }
  })
}, {
  name: 'cache',
  dependencies: ['redis']
})
