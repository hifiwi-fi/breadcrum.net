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
    client: fastify.redis.cache,
  })

  function getYTDLPMetaKey ({
    url,
    medium,
    attempt = 0,
  }) {
    assert(url, 'url required')
    assert(medium, 'medium required')
    return [
      'meta',
      url,
      medium,
      attempt,
    ].join(':')
  }

  const ytdlpTtl = 1000 * 60 * 20 // 20 mins,

  fastify.decorate('cache', cache)
  fastify.decorate('ytdlpCache', {
    async get ({ url, medium } = {}) {
      const key = getYTDLPMetaKey({ url, medium })
      const results = await cache.get(key)
      return results?.item
    },
    set ({ url, medium } = {}, value) {
      const key = getYTDLPMetaKey({ url, medium })
      return cache.set(key, value, ytdlpTtl)
    },
  })
}, {
  name: 'cache',
  dependencies: ['redis'],
})
