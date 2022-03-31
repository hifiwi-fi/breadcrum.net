import fp from 'fastify-plugin'
import SQL from '@nearform/sql'
import { randomUUID } from 'crypto'

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
    },
    trusted: async (request, decodedToken) => {
      const query = SQL`
      SELECT jti, owner_id, created_at, user_agent, ip
        FROM auth_tokens
        WHERE jti = ${decodedToken.jti}
      `
      const results = await fastify.pg.query(query)
      return results.rowCount === 1
    }
  })

  /**
   * verifyJWT used in fastify-auth to verify jwt tokens
   */
  fastify.decorate('verifyJWT', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.deleteJWTCookie()
      throw err
    }
  })

  /**
   * createToken creates a token for a user, sets the cookie and returns the token
   * @param  {[type]} user) {               const token [description]
   * @return {[type]}       [description]
   */
  fastify.decorateReply('createJWTToken', async function (user) {
    const uuid = randomUUID()
    const token = await this.jwtSign({
      ...user,
      jti: uuid
    })

    const userAgent = this.request.headers['user-agent']
    const ip = Array.isArray(this.request.ips) ? [...this.request.ips].pop() : this.request.ip

    const query = SQL`
        INSERT INTO auth_tokens (jti, owner_id, user_agent, ip) VALUES (
          ${uuid},
          ${user.id},
          ${userAgent || null},
          ${ip || null}
        );`

    const results = await fastify.pg.query(query)

    this.log.info(`Deleted ${results.rowCount} auth_tokens rows`)

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
      {
        path: '/',
        domain: fastify.config.DOMAIN
      }
    )
  })
}, {
  name: 'jwt',
  dependencies: ['env', 'cookie', 'pg']
})