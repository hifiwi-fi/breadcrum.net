import fp from 'fastify-plugin'
// @ts-ignore
import abstractCacheRedis from 'abstract-cache-redis'
import { getYTDLPMetaKey, ytdlpTtl } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

/**
 * @import { YTDLPMetaKeyParams } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 */

/**
 * @typedef {Object} FileKeyParams
 * @property {string} userId - The user ID.
 * @property {string} episodeId - The episode ID.
 * @property {string} sourceUrl - The source URL of the file.
 * @property {string} type - The type of the file.
 * @property {string} medium - The medium of the file.
 */

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, _) {
  const cache = abstractCacheRedis({

    client: fastify.redis['cache'],
  })

  /**
   * Generates a file key based on the provided parameters.
   *
   * @param {FileKeyParams} params - The parameters for generating the file key.
   * @returns {string} The generated file key.
   */
  function getFileKey ({
    userId,
    episodeId,
    sourceUrl,
    type,
    medium,
  }) {
    return [
      'file',
      userId,
      episodeId,
      sourceUrl,
      type,
      medium,
    ].join(':')
  }

  const urlCacheTtl = 1000 * 60 * 20 // 20 mins

  fastify.decorate('cache', cache)

  fastify.decorate('urlCache', {
    /**
     * @param {FileKeyParams} params - The parameters for retrieving the cached value.
     * @returns {Promise<any>} The cached value.
     */
    async get ({ userId, episodeId, sourceUrl, type, medium }) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      const results = await cache.get(key)
      return results?.item
    },

    /**
     * @param {FileKeyParams} params - The parameters for setting the cached value.
     * @param {any} value - The value to cache.
     * @returns {Promise<void>}
     */
    set ({ userId, episodeId, sourceUrl, type, medium }, value) {
      const key = getFileKey({ userId, episodeId, sourceUrl, type, medium })
      return cache.set(key, value, urlCacheTtl)
    },
  })

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
