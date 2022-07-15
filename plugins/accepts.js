import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-accepts
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/accepts'))
}, {
  name: 'accepts',
  dependencies: []
})
