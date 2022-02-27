import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-caching
 *
 * @see https://github.com/fastify/fastify-caching
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-caching'))
}, {
  name: 'cache'
})
