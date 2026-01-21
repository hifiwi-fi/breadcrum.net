import fp from 'fastify-plugin'
import SQL from '@nearform/sql'

/**
 * @import { FastifyRequest } from 'fastify'
 * @import { QueryResult } from 'pg'
 * @import { AuthTokenSource as AuthTokenSourceType } from '../routes/api/user/auth-tokens/schemas/auth-token-base.js'
 */

/**
 * @typedef {object} JwtUser
 * @property {string} username - The username
 * @property {string} id - The UUID user id
 * @property {string | null} [note] - Optional note for the auth token
 * @property {boolean} [protect] - Optional protect status for the auth token
 */

/**
 * @typedef {JwtUser & { jti: string }} JwtUserWithTokenId
 * @property {string} jti - The ID of the JWT auth token
 */

/**
 * @typedef {AuthTokenSourceType} AuthTokenSource
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
      signed: true,
    },
    trusted: async (request, decodedToken) => {
      const query = SQL`
      SELECT
        jti,
        owner_id,
        created_at,
        user_agent,
        ip,
        last_seen,
        (last_seen < NOW() - INTERVAL '24 hours') as needs_update
      FROM auth_tokens
      WHERE jti = ${decodedToken['jti']}
      `
      /** @type {QueryResult<{
       * jti: string,
       * owner_id: string,
       * created_at: Date,
       * user_agent: string | null,
       * ip: string | null,
       * last_seen: Date,
       * needs_update: boolean}>} */
      const results = await fastify.pg.query(query)

      // Only trust JWT tokens if they are still in the DB.
      if (results.rowCount === 1) {
        const token = results.rows[0]

        // Fire and forget update if last_seen is older than 24 hours
        if (token && token.needs_update) {
          const userAgent = request.headers['user-agent']
          const ip = Array.isArray(request.ips) ? [...request.ips].pop() : request.ip

          // Don't await this update - fire and forget

          const updateQuery = SQL`
              UPDATE auth_tokens
              SET
                last_seen = NOW(),
                user_agent = ${userAgent || null},
                ip = ${ip || null}::inet
              WHERE jti = ${decodedToken['jti']}
            `

          // We don' await this promise so that we don't block requests
          fastify.pg.query(updateQuery).catch(err => {
            fastify.log.error({ err, jti: decodedToken['jti'] }, 'Failed to update auth token last_seen')
          })
        }

        return true
      }

      // TODO: Expire them automatically if they haven't been seen for over N days
      return false
    },
  })

  fastify.decorate('verifyJWT',
    /**
     * verifyJWT used in fastify-auth to verify jwt tokens
     * @param  {FastifyRequest} request
     * @return {Promise<void>}         [description]
     */
    async function (request) {
      fastify.otel.jwtVerifyCounter.add(1)
      try {
        await request.jwtVerify()
      } catch (err) {
        // reply.deleteJWTCookie()
        fastify.otel.jwtVerifyFailCounter.add(1)
        throw err
      }
    }
  )

  fastify.decorateReply('createJWTToken',
    /**
     * Creates a JWT token for the given user.
     *
     * @async
     * @param {JwtUser} user - The user object containing the username and id.
     * @param {AuthTokenSource} source - What source we should mark the API token as.
     * @returns {Promise<string>} The generated JWT token.
     * @throws {Error} If no jti is returned when creating an auth token.
     */
    async function (user, source) {
      const userAgent = this.request.headers['user-agent']
      const ip = Array.isArray(this.request.ips) ? [...this.request.ips].pop() : this.request.ip

      const query = SQL`
        insert into auth_tokens (owner_id, user_agent, ip, note, protect, source) values (
          ${user.id},
          ${userAgent || null},
          ${ip || null}::inet,
          ${user.note || null},
          ${user.protect || false},
          ${source}
        )
        returning jti;`

      const results = await fastify.pg.query(query)
      const jti = results.rows[0].jti
      if (!jti) throw new Error('No jti returned when creating an auth token')

      /** @type {JwtUserWithTokenId} */
      const tokenBody = {
        ...user,
        jti,
      }
      const token = await this.jwtSign(tokenBody)

      fastify.otel.jwtCreatedCounter.add(1)

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
          signed: true,
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
          path: '/',
        }
      )
    })
}, {
  name: 'jwt',
  dependencies: ['env', 'cookie', 'pg', 'otel-metrics'],
})
