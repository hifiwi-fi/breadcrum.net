import fp from 'fastify-plugin'
import Fastify from 'fastify'

/**
 * This plugins adds promethius metrics
 *
 * @see https://gitlab.com/m03geek/fastify-metrics
 */
export default fp(async function (fastify, _) {
  await fastify.register((await import('fastify-metrics')).default, {
    defaultMetrics: { enabled: true },
    endpoint: null,
    name: 'metrics',
    routeMetrics: { enabled: true },
  })

  fastify.metrics.bookmarkCreatedCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_bookmark_created_total',
    help: 'The number of times bookmarks are created',
  })

  fastify.metrics.bookmarkDeleteCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_bookmark_deleted_total',
    help: 'The number of times bookmarks are deleted',
  })

  fastify.metrics.bookmarkEditCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_bookmark_edit_total',
    help: 'The number of times bookmarks are edited',
  })

  fastify.metrics.episodeCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_episode_created_total',
    help: 'The number of times episodes are created',
  })

  fastify.metrics.episodeEditCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_episode_edit_total',
    help: 'The number of times episodes are edited',
  })

  fastify.metrics.archiveEditCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_archive_edit_total',
    help: 'The number of times archives are edited',
  })

  fastify.metrics.episodeDeleteCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_episode_delete_total',
    help: 'The number of times episodes are deleted',
  })

  fastify.metrics.archiveDeleteCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_archive_delete_total',
    help: 'The number of times archives are deleted',
  })

  fastify.metrics.tagAppliedCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_tag_applied_total',
    help: 'The number of times tags are applied to bookmarks',
  })

  fastify.metrics.tagRemovedCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_tag_removed_total',
    help: 'The number of times tags are removed from bookmarks',
  })

  fastify.metrics.userCreatedCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_user_created_total',
    help: 'The number of times a new user is created',
  })

  fastify.metrics.ytdlpSeconds = new fastify.metrics.client.Histogram({
    name: 'breadcrum_ytdlp_seconds',
    help: 'The time it takes for ytdlp items to finish',
  })

  fastify.metrics.siteMetaSeconds = new fastify.metrics.client.Histogram({
    name: 'breadcrum_site_meta_seconds',
    help: 'The time it takes for site meta extraction',
  })

  fastify.metrics.archiveSeconds = new fastify.metrics.client.Histogram({
    name: 'breadcrum_archive_seconds',
    help: 'The time it takes for readability archive extraction',
  })

  fastify.metrics.archiveCounter = new fastify.metrics.client.Counter({
    name: 'breadcrum_archive_created_total',
    help: 'The number of times a readability archive is created',
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
      await promServer.listen({
        port: 9091,
        host: '0.0.0.0',
      })
    } catch (err) {
      promServer.log.error(err)
      promServer.log.info('promethius server stopped')
      process.exit(1)
    }
  }

  if (fastify.config.METRICS) {
    fastify.addHook('onReady', async () => {
      await start()
    })
  }

  fastify.addHook('onClose', async (_) => {
    await promServer.close()
  })
},
{
  name: 'prom',
  dependencies: ['env'],
})
