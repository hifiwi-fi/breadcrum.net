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

  // TODO: Maybe delete these mem caches or move them to redis

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
  const ytDLPMemMetaCache = new LRU({
    max: 200,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })

  function getYTDLPMetaKey ({
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

  fastify.decorate('ytDLPMemMetaCache', {
    get ({ url, medium } = {}) {
      const key = getYTDLPMetaKey({ url, medium })
      return ytDLPMemMetaCache.get(key)
    },
    set ({ url, medium } = {}, value) {
      const key = getYTDLPMetaKey({ url, medium })
      return ytDLPMemMetaCache.set(key, value)
    }
  })

  // For caching server extracted site metadata
  const siteMetaCache = new LRU({
    max: 200,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })

  function getSiteMetaKey ({
    url,
    medium
  }) {
    assert(url, 'url required')
    return [
      'smeta',
      url
    ].join(':')
  }

  fastify.decorate('siteMetaCache', {
    get ({ url } = {}) {
      const key = getSiteMetaKey({ url })
      return siteMetaCache.get(key)
    },
    set ({ url } = {}, value) {
      const key = getSiteMetaKey({ url })
      return siteMetaCache.set(key, value)
    }
  })

  // For caching server extracted site metadata
  const archiveCache = new LRU({
    max: 50,
    ttl: 1000 * 60 * 5, // 20 mins,
    updateAgeOnGet: false,
    ttlAutopurge: true
  })

  function getArchiveCacheKey ({
    url
  }) {
    assert(url, 'url required')
    return [
      'readability',
      url
    ].join(':')
  }

  fastify.decorate('archiveCache', {
    get ({ url } = {}) {
      const key = getArchiveCacheKey({ url })
      return archiveCache.get(key)
    },
    set ({ url } = {}, value) {
      const key = getArchiveCacheKey({ url })
      return archiveCache.set(key, value)
    }
  })
}, {
  name: 'cache',
  dependencies: ['redis']
})
