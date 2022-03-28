import fp from 'fastify-plugin'

/**
 * This plugins adds express session
 *
 * @see https://github.com/fastify/fastify-secure-session
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-secure-session'), {
    cookieName: `${fastify.config.APP_NAME}_session`,
    key: Buffer.from(fastify.config.COOKIE_SECRET, 'hex'),
    cookie: {
      expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      // domain: 'localhost',
      secure: fastify.config.ENV === 'production',
      sameSite: fastify.config.ENV === 'production' ? 'none' : undefined,
      httpOnly: true
      // options for setCookie, see https://github.com/fastify/fastify-cookie
    }
  })
}, {
  name: 'session',
  dependencies: ['env']
})
