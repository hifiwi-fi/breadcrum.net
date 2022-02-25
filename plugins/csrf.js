import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-csrf
 *
 * @see https://github.com/fastify/fastify-csrf
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-csrf'), {
    sessionPlugin: 'fastify-secure-session',
    cookieKey: `${fastify.config.APP_NAME}_csrf`,
    sessionKey: `${fastify.config}_csrf_session`
  })
}, {
  name: 'csrf',
  dependencies: ['env', 'session']
})
