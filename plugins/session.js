import fp from 'fastify-plugin'

/**
 * This plugins adds express session
 *
 * @see https://github.com/fastify/fastify-secure-session
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-secure-session'), {
    cookieName: `${fastify.config.APP_NAME}_session`,
    key: Buffer.from(fastify.config.COOKIE_SECRET, 'hex')
  })
}, {
  name: 'session',
  dependencies: ['env']
})
