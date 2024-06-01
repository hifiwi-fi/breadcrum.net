/* eslint-disable dot-notation */
import fp from 'fastify-plugin'
import SQL from '@nearform/sql'

/**
 * @import { FastifyRequest } from 'fastify'
 */

/**
 * @typedef {Object} JwtUser
 * @property {string} username - The username
 * @property {string} id - The UUID user id
 */

/**
 * @typedef {JwtUser & { jti: string }} JwtUserWithTokenId
 * @property {string} jti - The ID of the JWT auth token
 */

/**
 * This plugins adds jwt token support
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/jwt'), {
    secret: fastify.config.JWT_SECRET,
    cookie: {
      cookieName: fastify.config.COOKIE_NAME,
      signed: true
    },
    trusted: async (_, decodedToken) => {
      const query = SQL`
      SELECT jti, owner_id, created_at, user_agent, ip
        FROM auth_tokens
        WHERE jti = ${decodedToken['jti']}
      `
      const results = await fastify.pg.query(query)
      return results.rowCount === 1
    }
  })

  const jwtVerifyCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_jwt_verify_total',
    help: 'The number of times a jwt token attempts verification'
  })

  const jwtVerifyFailCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_jwt_verify_fail_total',
    help: 'The number of times a jwt token attempts verification'
  })

  fastify.decorate('verifyJWT',
    /**
     * verifyJWT used in fastify-auth to verify jwt tokens
     * @param  {FastifyRequest} request
     * @return {Promise<void>}         [description]
     */
    async function (request) {
      jwtVerifyCounter.inc()
      try {
        await request.jwtVerify()
      } catch (err) {
        // reply.deleteJWTCookie()
        jwtVerifyFailCounter.inc()
        throw err
      }
    }
  )

  const jwtCreatedCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_jwt_created_total',
    help: 'The number of times a jwt token is created'
  })

  fastify.decorateReply('createJWTToken',
    /**
     * Creates a JWT token for the given user.
     *
     * @async
     * @param {JwtUser} user - The user object containing the username and id.
     * @returns {Promise<string>} The generated JWT token.
     * @throws {Error} If no jti is returned when creating an auth token.
     */
    async function (user) {
      const userAgent = this.request.headers['user-agent']
      const ip = Array.isArray(this.request.ips) ? [...this.request.ips].pop() : this.request.ip

      const query = SQL`
        insert into auth_tokens (owner_id, user_agent, ip) values (
          ${user.id},
          ${userAgent || null},
          ${ip || null}
        )
        returning jti;`

      const results = await fastify.pg.query(query)
      const jti = results.rows[0].jti
      if (!jti) throw new Error('No jti returned when creating an auth token')

      /** @type {JwtUserWithTokenId} */
      const tokenBody = {
        ...user,
        jti
      }
      const token = await this.jwtSign(tokenBody)

      jwtCreatedCounter.inc()

      return token
    })

  fastify.decorateReply('setJWTCookie',
  /**
   * Sets a JWT cookie from the given token.
   *
   * @param {string} token - The JWT token to set as a cookie.
   */
    function (token) {
      this.setCookie(
        fastify.config.COOKIE_NAME,
        token,
        {
          expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          path: '/',
          secure: fastify.config.ENV !== 'development',
          sameSite: fastify.config.ENV !== 'development',
          httpOnly: true,
          signed: true
        }
      )
    })

  fastify.decorateReply('deleteJWTCookie',
    /**
     * Clears the JWT cookie.
     */
    function () {
      this.clearCookie(
        fastify.config.COOKIE_NAME,
        {
          path: '/'
        }
      )
    })
}, {
  name: 'jwt',
  dependencies: ['env', 'cookie', 'pg', 'prom']
})
