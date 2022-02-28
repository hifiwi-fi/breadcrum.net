import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-cors
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-cors'))
}, {
  name: 'cors',
  dependencies: ['env']
})
