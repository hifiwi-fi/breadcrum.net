import type PgBoss from '@breadcrum/resources/pgboss/types.js'
import type {
  ResolveEpisodePgBossW,
  ResolveEpisodePgBossQ
} from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import type {
  ResolveArchivePgBossW,
  ResolveArchivePgBossQ
} from '@breadcrum/resources/archives/resolve-archive-queue.js'
import type {
  ResolveBookmarkPgBossW,
  ResolveBookmarkPgBossQ
} from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import type {
  CleanupAuthTokensPgBossW,
  CleanupAuthTokensPgBossQ
} from '@breadcrum/resources/auth-tokens/cleanup-auth-tokens-queue.js'
import type {
  SyncSubscriptionPgBossW,
  SyncSubscriptionPgBossQ
} from '@breadcrum/resources/billing/sync-subscription-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    pgboss: {
      boss: PgBoss
      workers: {
        resolveEpisode: ResolveEpisodePgBossW[]
        resolveArchive: ResolveArchivePgBossW[]
        resolveBookmark: ResolveBookmarkPgBossW[]
        'cleanup-stale-auth-tokens': CleanupAuthTokensPgBossW[]
        'sync-subscription': SyncSubscriptionPgBossW[]
      }
      queues: {
        resolveEpisodeQ: ResolveEpisodePgBossQ
        resolveArchiveQ: ResolveArchivePgBossQ
        resolveBookmarkQ: ResolveBookmarkPgBossQ
        cleanupAuthTokensQ: CleanupAuthTokensPgBossQ
        syncSubscriptionQ: SyncSubscriptionPgBossQ
      }
    }
  }
}
