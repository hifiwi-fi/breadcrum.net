import fp from 'fastify-plugin'

export default fp(async function (fastify, opts) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (fastify.config.ENV === 'production' && request.hostname.startsWith('www')) {
      reply.redirect(308, `${fastify.config.DOMAIN}${request.path}`)
    }
  })
}, {
  name: 'redirector',
  dependencies: ['env']
})
