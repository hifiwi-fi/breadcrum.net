import fp from 'fastify-plugin'

/**
 * This plugins adds a redis connection
 *
 * @see https://github.com/fastify/fastify-redis
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/redis'), {
    url: fastify.config.REDIS_URL,
    family: 6,
    connectTimeout: 500,
    maxRetriesPerRequest: 1
  })
},
{
  name: 'redis',
  dependencies: ['env']
})
