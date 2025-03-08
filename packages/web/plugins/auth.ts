import fp from 'fastify-plugin'
import SQL from '@nearform/sql'
import type { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * This plugin adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-auth
 */
export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(import('@fastify/auth'))

  fastify.decorate(
    'verifyAdmin',
    async function verifyAdmin (request: FastifyRequest): Promise<void> {
      const userId = request?.user?.id
      if (!userId) {
        throw new Error('verifyAdmin Error: No id found on request user object')
      }

      const adminQuery = SQL`
        select u.admin
        from users u
        where u.id = ${userId}
        fetch first 1 rows only;
      `

      const results = await fastify.pg.query(adminQuery)
      const user = results.rows.pop()

      if (!user) {
        throw new Error('verifyAdmin Error: userId not found')
      }
      if (!user.admin) {
        throw new Error('verifyAdmin Error: userId does not have administrative access')
      }
    }
  )

  fastify.decorate(
    'notDisabled',
    async function notDisabled (request: FastifyRequest): Promise<void> {
      const userId = request?.user?.id
      if (!userId) {
        throw new Error('notDisabled Error: No id found on request user object')
      }

      const disabledQuery = SQL`
        select u.disabled
        from users u
        where u.id = ${userId}
        fetch first 1 rows only;
      `

      const results = await fastify.pg.query(disabledQuery)
      const user = results.rows.pop()

      if (!user) {
        throw new Error('notDisabled Error: userId not found')
      }
      if (user.disabled) {
        throw new Error('notDisabled Error: userId is disabled')
      }
    }
  )
}, {
  name: 'auth',
  dependencies: ['env', 'jwt', 'pg'],
})

// Extend FastifyInstance to include the new authentication decorators
declare module 'fastify' {
  interface FastifyInstance {
    verifyAdmin(request: FastifyRequest): Promise<void>;
    notDisabled(request: FastifyRequest): Promise<void>;
  }
}
