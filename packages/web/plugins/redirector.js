import fp from 'fastify-plugin'

export default fp(async function (fastify, _) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (
      fastify.config.ENV === 'production' &&
      (request.headers?.host?.startsWith('www.') || request.headers?.host?.endsWith('.fly.dev'))
    ) {
      return reply.redirect(301, `${fastify.config.TRANSPORT}://${fastify.config.HOST}${request.url}`)
    }
  })
}, {
  name: 'redirector',
  dependencies: ['env'],
})
