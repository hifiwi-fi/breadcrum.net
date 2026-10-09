import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-compress
 *
 * @see https://github.com/fastify/fastify-compress
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/compress'))
}, {
  name: 'compress',
})
