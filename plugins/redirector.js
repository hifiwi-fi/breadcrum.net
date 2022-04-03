import fp from 'fastify-plugin'

export default fp(async function (fastify, opts) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (
      fastify.config.ENV === 'production' &&
      (request.headers?.host?.startsWith('www.') || request.headers?.host?.endsWith('.fly.dev'))
    ) {
      return reply.redirect(301, 'https://' + fastify.config.DOMAIN + request.url)
    }
  })
}, {
  name: 'redirector',
  dependencies: ['env']
})
