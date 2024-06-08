import fp from 'fastify-plugin'

/** * This plugins adds fastify-accepts
 *
 * @see https://github.com/fastify/fastify-accepts
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/accepts'))
}, {
  name: 'accepts',
  dependencies: [],
})
