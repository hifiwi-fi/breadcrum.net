import type PgBoss from '@breadcrum/resources/pgboss/types.js'
import type {
  ResolveEpisodePgBossQ
} from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import type {
  ResolveArchivePgBossQ
} from '@breadcrum/resources/archives/resolve-archive-queue.js'
import type {
  ResolveBookmarkPgBossQ
} from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import type {
  SyncSubscriptionPgBossQ
} from '@breadcrum/resources/billing/sync-subscription-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    pgboss: {
      boss: PgBoss
      config: PgBoss.ConstructorOptions
      queues: {
        resolveEpisodeQ: ResolveEpisodePgBossQ
        resolveArchiveQ: ResolveArchivePgBossQ
        resolveBookmarkQ: ResolveBookmarkPgBossQ
        syncSubscriptionQ: SyncSubscriptionPgBossQ
      }
    }
  }
}
