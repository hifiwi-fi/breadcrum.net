import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-auth
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-auth'))

  // Used when checking for a user session
  fastify.decorate('verifySession', async (request, reply) => {
    const userId = request.session.get('userId')
    if (!userId) throw new Error('No user session found.')
  })
}, {
  name: 'auth',
  dependencies: ['env', 'session']
})
