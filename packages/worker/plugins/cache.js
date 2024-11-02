import fp from 'fastify-plugin'
// @ts-ignore
import abstractCacheRedis from 'abstract-cache-redis'
import { getYTDLPMetaKey, ytdlpTtl } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

/**
 * @import { YTDLPMetaKeyParams } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 */

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, _opts) {
  const cache = abstractCacheRedis({
    client: fastify.redis['cache'],
  })

  fastify.decorate('cache', cache)
  fastify.decorate('ytdlpCache', {
  /**
   * @param {YTDLPMetaKeyParams} params - The parameters for retrieving the cached value.
   * @returns {Promise<any>} The cached value.
   */
    async get ({ url, medium, attempt }) {
      const key = getYTDLPMetaKey({ url, medium, attempt })
      const results = await cache.get(key)
      return results?.item
    },

    /**
   * @param {YTDLPMetaKeyParams} params - The parameters for setting the cached value.
   * @param {any} value - The value to cache.
   * @returns {Promise<void>}
   */
    set ({ url, medium, attempt }, value) {
      const key = getYTDLPMetaKey({ url, medium, attempt })
      return cache.set(key, value, ytdlpTtl)
    },
  })
}, {
  name: 'cache',
  dependencies: ['redis'],
})
