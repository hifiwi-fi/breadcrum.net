import fp from 'fastify-plugin'
import Fastify from 'fastify'

/**
 * This plugin adds Prometheus metrics under the 'prom' decorator.
 *
 * @see https://gitlab.com/m03geek/fastify-metrics
 */
export default fp(async function (fastify, _) {
  // @ts-ignore
  await fastify.register((await import('fastify-metrics')).default, {
    defaultMetrics: { enabled: true },
    endpoint: null,
    name: 'metrics',
    routeMetrics: { enabled: true },
  })

  fastify.decorate('prom', {
    bookmarkCreatedCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_bookmark_created_total',
      help: 'The number of times bookmarks are created',
    }),

    bookmarkDeleteCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_bookmark_deleted_total',
      help: 'The number of times bookmarks are deleted',
    }),

    bookmarkEditCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_bookmark_edit_total',
      help: 'The number of times bookmarks are edited',
    }),

    episodeCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_episode_created_total',
      help: 'The number of times episodes are created',
    }),

    episodeEditCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_episode_edit_total',
      help: 'The number of times episodes are edited',
    }),

    archiveEditCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_archive_edit_total',
      help: 'The number of times archives are edited',
    }),

    episodeDeleteCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_episode_delete_total',
      help: 'The number of times episodes are deleted',
    }),

    archiveDeleteCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_archive_delete_total',
      help: 'The number of times archives are deleted',
    }),

    tagAppliedCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_tag_applied_total',
      help: 'The number of times tags are applied to bookmarks',
    }),

    tagRemovedCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_tag_removed_total',
      help: 'The number of times tags are removed from bookmarks',
    }),

    userCreatedCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_user_created_total',
      help: 'The number of times a new user is created',
    }),

    ytdlpSeconds: new fastify.metrics.client.Histogram({
      name: 'breadcrum_ytdlp_seconds',
      help: 'The time it takes for ytdlp items to finish',
    }),

    siteMetaSeconds: new fastify.metrics.client.Histogram({
      name: 'breadcrum_site_meta_seconds',
      help: 'The time it takes for site meta extraction',
    }),

    archiveSeconds: new fastify.metrics.client.Histogram({
      name: 'breadcrum_archive_seconds',
      help: 'The time it takes for readability archive extraction',
    }),

    archiveCounter: new fastify.metrics.client.Counter({
      name: 'breadcrum_archive_created_total',
      help: 'The number of times a readability archive is created',
    }),
  })

  const promServer = Fastify({
    logger: true,
  })

  promServer.route({
    url: '/metrics',
    method: 'GET',
    logLevel: 'info',
    schema: {
      // hide route from swagger plugins
      hide: true,
    },
    handler: async (_, reply) => {
      reply.type('text/plain').send(await fastify.metrics.client.register.metrics())
    },
  })

  const start = async () => {
    try {
      // Use port 0 in test environments to get a random available port
      const isTestEnv = process.env['NODE_TEST_CONTEXT'] === '1' || process.argv.includes('--test')
      await promServer.listen({
        port: isTestEnv ? 0 : 9091,
        host: '0.0.0.0',
      })
    } catch (err) {
      promServer.log.error(err)
      promServer.log.info('prometheus server stopped')
      // Don't exit the process during tests, just log the error
      if (!(process.env['NODE_TEST_CONTEXT'] === '1' || process.argv.includes('--test'))) {
        process.exit(1)
      }
    }
  }

  // Skip starting prom server during tests if env variable is set
  const isTestEnv = process.env['NODE_TEST_CONTEXT'] === '1' || process.argv.includes('--test')
  if (fastify.config.METRICS && (!isTestEnv || process.env['ENABLE_PROM_IN_TESTS'] === '1')) {
    fastify.addHook('onReady', async () => {
      console.log('prom server starting')
      await start()
      const address = promServer.server.address()
      const port = address && typeof address === 'object' ? address.port : 9091
      console.log(`prom server started on port ${port}`)
    })
  }

  fastify.addHook('onClose', async (_) => {
    try {
      await promServer.close()
    } catch (err) {
      // Ignore errors during close
      console.log('prom server close error:', err)
    }
  })
},
{
  name: 'prom',
  dependencies: ['env'],
})
