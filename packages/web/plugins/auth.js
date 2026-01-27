import fp from 'fastify-plugin'
import SQL from '@nearform/sql'

/**
 * @import { FastifyRequest } from 'fastify'
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const authEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    TURNSTILE_VALIDATE: { type: 'boolean', default: true },
    TURNSTILE_SITEKEY: { type: 'string', default: '1x00000000000000000000AA' },
    TURNSTILE_SECRET_KEY: { type: 'string', default: '1x0000000000000000000000000000000AA' },
    PASSKEY_MAX_PER_USER: {
      type: 'integer',
      default: 10,
      minimum: 1,
      maximum: 100,
      description: 'Maximum number of passkeys allowed per user',
    },
    PASSKEY_CHALLENGE_TIMEOUT: {
      type: 'integer',
      default: 300000,
      description: 'Passkey challenge timeout in milliseconds (default: 5 minutes)',
    },
  },
  required: ['TURNSTILE_SECRET_KEY'],
})

/**
 * This plugins adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-auth
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/auth'))
  fastify.decorate('verifyAdmin',
    /**
     * @param  {FastifyRequest} request
     * @return {Promise<Void>}
     */
    async function verifyAdmin (request) {
    // TODO: is this the right file for this?
      // Support both JWT authentication (request.user.id) and basicAuth (request.feedTokenUser.userId)
      // feedTokenUser is set by @fastify/basic-auth validation in feed route autohooks
      const userId = request?.user?.id || request?.feedTokenUser?.userId
      if (!userId) throw new Error('verifyAdmin Error: No id found on request user object')
      const adminQuery = SQL`
    select u.admin
    from users u
    where u.id = ${userId}
    fetch first 1 rows only;
  `

      const results = await fastify.pg.query(adminQuery)
      const user = results.rows.pop()
      if (!user) throw new Error('verifyAdmin Error: userId not found')
      if (!user.admin) throw new Error('verifyAdmin Error: userId does not have administrative access')
    // Congrats you are an admin
    })

  fastify.decorate('notDisabled',
    /**
     * @param  {FastifyRequest} request
     * @return {Promise<Void>}
     */
    async function notDisabled (request) {
    // TODO: is this the right file for this?
      // Support both JWT authentication (request.user.id) and basicAuth (request.feedTokenUser.userId)
      // feedTokenUser is set by @fastify/basic-auth validation in feed route autohooks
      const userId = request?.user?.id || request?.feedTokenUser?.userId
      if (!userId) throw new Error('notDisabled Error: No id found on request user object')
      const disabledQuery = SQL`
      select u.disabled
      from users u
      where u.id = ${userId}
      fetch first 1 rows only;
    `

      const results = await fastify.pg.query(disabledQuery)
      const user = results.rows.pop()
      if (!user) throw new Error('notDisabled Error: userId not found')
      if (user.disabled) throw new Error('notDisabled Error: userId is disabled')
    // Congrats you are not disabled
    })
}, {
  name: 'auth',
  dependencies: ['env', 'jwt', 'pg'],
})
