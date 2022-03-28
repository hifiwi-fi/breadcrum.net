import fp from 'fastify-plugin'
import SQL from '@nearform/sql'

/**
 * This plugins adds jwt token support
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-jwt'), {
    secret: fastify.config.JWT_SECRET,
    cookie: {
      cookieName: fastify.config.COOKIE_NAME,
      signed: true
    }
  })

  /**
   * verifyJWT used in fastify-auth to verify jwt tokens
   */
  fastify.decorate('verifyJWT', async function (req, reply) {
    await req.jwtVerify()
  })

  /**
   * createToken creates a token for a user, sets the cookie and returns the token
   * @param  {[type]} user) {               const token [description]
   * @return {[type]}       [description]
   */
  fastify.decorateReply('createToken', async function (user) {
    const token = await this.jwtSign({
      ...user
    })

    const userAgent = this.headers['user-agent']
    const ip = [...this.ips].pop()

    console.log({ userAgent, token, ip, owner_id: user.id })

    const query = SQL`
        INSERT INTO auth_tokens (token, owner_id, user_agent, ip) VALUES (
          ${token},
          ${user.id},
          ${userAgent},
          ${ip}
        );`

    const results = await fastify.pg.query(query)

    // TODO: Delete
    console.log(results)

    this.setJWTCookie(token)

    return token
  })

  /**
   * Set a JWT cookie from a token.
   */
  fastify.decorateReply('setJWTCookie', function (token) {
    this.setCookie(
      fastify.config.COOKIE_NAME,
      token,
      {
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        domain: fastify.config.DOMAIN,
        path: '/',
        secure: fastify.config.DOMAIN !== 'localhost',
        sameSite: fastify.config.DOMAIN !== 'localhost',
        httpOnly: true,
        signed: true
      }
    )
  })

  /**
   * deleteJWTCookie clears a JWT cookie
   */
  fastify.decorateReply('deleteJWTCookie', function () {
    this.clearCookie(
      fastify.config.COOKIE_NAME,
      { path: '/' }
    )
  })
}, {
  name: 'jwt',
  dependencies: ['env', 'cookie', 'pg']
})
