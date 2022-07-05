import fp from 'fastify-plugin'
import Fastify from 'fastify'

/**
 * This plugins adds promethius metrics
 *
 * @see https://gitlab.com/m03geek/fastify-metrics
 */
export default fp(async function (fastify, opts) {
  fastify.register((await import('fastify-metrics')).default /* double default export bug */, {
    defaultMetrics: { enabled: true },
    endpoint: null,
    name: 'metrics',
    routeMetrics: { enabled: true }
  })

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
      await promServer.listen({
        port: 9091,
        host: '0.0.0.0'
      })
    } catch (err) {
      promServer.log.error(err)
      promServer.log('promethius server stopped')
      process.exit(1)
    }
  }

  fastify.addHook('onClose', async (instance) => {
    await promServer.close()
  })
  await start()
},
{
  name: 'prom',
  dependencies: ['env']
})
