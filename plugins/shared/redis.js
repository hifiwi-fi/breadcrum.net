import fp from 'fastify-plugin'

export { redisEnvSchema } from '#config/env-fragments.js'

/**
 * This plugins adds a redis connection
 *
 * @see https://github.com/fastify/fastify-redis
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/redis'), {
    url: fastify.config.REDIS_CACHE_URL,
    family: 6,
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    namespace: 'cache',
  })
},
{
  name: 'redis',
  dependencies: ['env'],
})
