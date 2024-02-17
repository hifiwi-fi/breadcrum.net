import fp from 'fastify-plugin'
import abstractCacheRedis from 'abstract-cache-redis'
import assert from 'webassert'

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, opts) {
  const cache = abstractCacheRedis({
    client: fastify.redis.cache
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

  const urlCacheTtl = 1000 * 60 * 20 // 20 mins

  fastify.decorate(cache, cache)
  fastify.decorate('urlCache', {
    async get ({ userId, episodeId, sourceUrl, type, medium } = {}) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      const results = await cache.get(key)
      return results?.item
    },
    set ({ userId, episodeId, sourceUrl, type, medium } = {}, value) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      return cache.set(key, value, urlCacheTtl)
    }
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

  const ytdlpTtl = 1000 * 60 * 20 // 20 mins,

  fastify.decorate('ytdlpCache', {
    async get ({ url, medium } = {}) {
      const key = getYTDLPMetaKey({ url, medium })
      const results = await cache.get(key)
      return results?.item
    },
    set ({ url, medium } = {}, value) {
      const key = getYTDLPMetaKey({ url, medium })
      return cache.set(key, value, ytdlpTtl)
    }
  })
}, {
  name: 'cache',
  dependencies: ['redis']
})
