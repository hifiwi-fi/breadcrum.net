import fp from 'fastify-plugin'
// @ts-ignore
import abstractCacheRedis from 'abstract-cache-redis'

/**
 * @typedef {Object} FileKeyParams
 * @property {string} userId - The user ID.
 * @property {string} episodeId - The episode ID.
 * @property {string} sourceUrl - The source URL of the file.
 * @property {string} type - The type of the file.
 * @property {string} medium - The medium of the file.
 */

/**
 * @typedef {Object} YTDLPMetaKeyParams
 * @property {string} url - The URL of the YTDLP source.
 * @property {string} medium - The medium of the YTDLP source.
 * @property {number} attempt - Cache busting attempt key.
 */

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, _) {
  const cache = abstractCacheRedis({
    // eslint-disable-next-line dot-notation
    client: fastify.redis['cache']
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
    medium
  }) {
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
    }
  })

  /**
   * Generates a YTDLP meta key based on the provided parameters.
   *
   * @param {YTDLPMetaKeyParams} params - The parameters for generating the YTDLP meta key.
   * @returns {string} The generated YTDLP meta key.
   */
  function getYTDLPMetaKey ({
    url,
    medium,
    attempt = 0
  }) {
    return [
      'meta',
      url,
      medium,
      attempt
    ].join(':')
  }

  const ytdlpTtl = 1000 * 60 * 20 // 20 mins

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
    }
  })
}, {
  name: 'cache',
  dependencies: ['redis']
})
