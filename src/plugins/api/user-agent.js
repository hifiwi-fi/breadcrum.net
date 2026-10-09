import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-user-agent
 *
 * @see https://github.com/Eomm/fastify-user-agent
 */
export default fp(async function (fastify, _) {
  // @ts-ignore
  fastify.register(import('fastify-user-agent'))
}, {
  name: 'user-agent',
  dependencies: [],
})
