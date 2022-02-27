import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-auth
 *
 * @see https://github.com/fastify/fastify-auth
 */
export default fp(async function (fastify, opts) {
  fastify.register(async () => {
    const { fastifyRequestContextPlugin } = await import('fastify-request-context')
    return fastifyRequestContextPlugin
  }, {
    defaultStoreValues: {
      user: { id: null }
    }
  })

  fastify.addHook('onRequest', async (req, reply) => {
    // TODO: inject auth token ID into the context
    const sessionUserId = req.session.get('userId')
    if (sessionUserId) {
      req.requestContext.set('user', {
        id: sessionUserId
      })
    }
  })
}, {
  name: 'context',
  dependencies: ['session', 'auth', 'pg']
})
