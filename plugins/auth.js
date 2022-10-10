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
    const userID = request?.user?.id
    if (!userID) throw new Error('verifyAdmin Error: No id found on request user object')
    const adminQuery = SQL`
      select u.admin
      from users u
      where u.id = ${userID}
      fetch first 1 rows only;
    `

    const results = await fastify.pg.query(adminQuery)
    const user = results.rows.pop()
    if (!user) throw new Error('verifyAdmin Error: userID not found')
    if (!user.admin) throw new Error('verifyAdmin Error: userID does not have administrative access')
    // Congrats you are an admin
  })
}, {
  name: 'auth',
  dependencies: ['env', 'jwt', 'pg']
})
