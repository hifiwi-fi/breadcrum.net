import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-rate-limit
 *
 * @see https://github.com/fastify/fastify-rate-limit
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/rate-limit'), {

    redis: fastify.redis['cache'],
  })
}, {
  name: 'rateLimit',
  dependencies: ['redis'],
})
