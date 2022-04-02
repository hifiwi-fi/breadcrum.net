import fp from 'fastify-plugin'
import Fastify from 'fastify'

/**
 * This plugins adds promethius metrics
 *
 * @see https://gitlab.com/m03geek/fastify-metrics
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-metrics'), {})

  const promServer = Fastify({
    logger: true
  })

  promServer.route({
    url: '/metrics',
    method: 'GET',
    logLevel: 'info',
    schema: {
      // hide route from swagger plugins
      hide: true
    },
    handler: async (_, reply) => {
      reply.type('text/plain').send(await fastify.metrics.client.register.metrics())
    }
  })

  const start = async () => {
    try {
      await promServer.listen(9091, '0.0.0.0')
    } catch (err) {
      promServer.log.error(err)
      process.exit(1)
    }
  }

  fastify.addHook('onClose', async (instance) => {
    await promServer.close()
  })
  if (fastify.config.ENV === 'production') { await start() }
},
{
  name: 'prom',
  dependencies: ['env']
})
