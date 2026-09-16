import type { PgBoss, ConstructorOptions } from 'pg-boss'
import type { createProcessorTracker } from '#runtime/queue-lifecycle.js'
import type { ResolveEpisodePgBossQ } from '#resources/episodes/resolve-episode-queue.js'
import type { ResolveArchivePgBossQ } from '#resources/archives/resolve-archive-queue.js'
import type { ResolveBookmarkPgBossQ } from '#resources/bookmarks/resolve-bookmark-queue.js'
import type { CleanupAuthTokensPgBossQ } from '#resources/auth-tokens/cleanup-auth-tokens-queue.js'
import type { CleanupStaleResolutionsPgBossQ } from '#resources/stale-resolutions/cleanup-stale-resolutions-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    pgboss: {
      boss: PgBoss
      config: ConstructorOptions
      workers: Record<string, string[]>
      track: ReturnType<typeof createProcessorTracker>['track']
      queues: {
        resolveEpisodeQ: ResolveEpisodePgBossQ
        resolveArchiveQ: ResolveArchivePgBossQ
        resolveBookmarkQ: ResolveBookmarkPgBossQ
        cleanupAuthTokensQ: CleanupAuthTokensPgBossQ
        cleanupStaleResolutionsQ: CleanupStaleResolutionsPgBossQ
      }
    }
  }
}
