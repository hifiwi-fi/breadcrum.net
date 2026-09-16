/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { AppOptions } from '#config/options.js' */
import fp from 'fastify-plugin'
import { createResolveEpisodeQ } from '#resources/episodes/resolve-episode-queue.js'
import { createResolveArchiveQ } from '#resources/archives/resolve-archive-queue.js'
import { createResolveBookmarkQ } from '#resources/bookmarks/resolve-bookmark-queue.js'
import { createCleanupAuthTokensQ } from '#resources/auth-tokens/cleanup-auth-tokens-queue.js'
import { createCleanupStaleResolutionsQ } from '#resources/stale-resolutions/cleanup-stale-resolutions-queue.js'
import { startPGBoss } from '#resources/pgboss/start-pgboss.js'
import { defaultBossOptions } from '#resources/pgboss/default-job-options.js'
import { createProcessorTracker, createQueueLifecycle } from '../../runtime/queue-lifecycle.js'

/** @type {FastifyPluginAsync<AppOptions>} */
async function queuePlugin (fastify, opts) {
  /** @type {Record<string, string[]>} */
  const workers = {}
  const processors = createProcessorTracker()
  const boss = await startPGBoss({
    onCreate (boss) {
      const lifecycle = createQueueLifecycle(boss, workers, fastify.config.JOB_DRAIN_TIMEOUT_MS, processors)
      // Own the instance before startup or queue creation can fail or time out.
      fastify.addHook('preClose', lifecycle.stopIntake)
      fastify.addHook('onClose', lifecycle.close)
    },
    logger: fastify.log,
    pgBossOptions: {
      connectionString: fastify.config.DATABASE_URL,
      connectionTimeoutMillis: fastify.config.PG_CONNECTION_TIMEOUT_MS,
      // Producers must not run the scheduler or background queue supervision.
      schedule: opts.role !== 'api',
      supervise: opts.role !== 'api',
    },
  })

  const queues = {
    resolveEpisodeQ: await createResolveEpisodeQ({ boss }),
    resolveArchiveQ: await createResolveArchiveQ({ boss }),
    resolveBookmarkQ: await createResolveBookmarkQ({ boss }),
    cleanupAuthTokensQ: await createCleanupAuthTokensQ({ boss }),
    cleanupStaleResolutionsQ: await createCleanupStaleResolutionsQ({ boss }),
  }
  fastify.decorate('pgboss', { boss, config: defaultBossOptions, queues, workers, track: processors.track })
}

export default fp(queuePlugin, {
  dependencies: ['env', 'pg', 'cache', 'otel-metrics'],
  name: 'pgboss',
})
