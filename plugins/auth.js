import fp from 'fastify-plugin'
import SQL from '@nearform/sql'

/**
 * This plugins adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-auth
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/auth'))

  fastify.decorate('verifyAdmin', async function (request, reply) {
    // TODO: is this the right file for this?
    const userId = request?.user?.id
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

  fastify.decorate('notDisabled', async function (request, reply) {
    // TODO: is this the right file for this?
    const userId = request?.user?.id
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
  dependencies: ['env', 'jwt', 'pg']
})
