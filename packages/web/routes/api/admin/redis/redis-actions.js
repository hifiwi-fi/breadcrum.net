/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<{ status: string, cleared: boolean }>}
 */
export async function flushRedisCache (fastify) {
  const cacheRedis = fastify.redis['cache']
  if (!cacheRedis) throw new Error('Missing redis client')
  await cacheRedis.flushdb()
  return {
    status: 'cache cleared',
    cleared: true,
  }
}
