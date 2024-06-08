import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-circuit-breaker
 *
 * @see https://github.com/fastify/fastify-circuit-breaker
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/circuit-breaker'))
}, {
  name: 'circuitBreaker',
})
