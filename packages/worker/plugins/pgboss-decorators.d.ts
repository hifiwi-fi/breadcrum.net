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

declare module 'fastify' {
  interface FastifyInstance {
    pgboss: {
      boss: PgBoss
      workers: {
        resolveEpisode: ResolveEpisodePgBossW[]
        resolveArchive: ResolveArchivePgBossW[]
        resolveBookmark: ResolveBookmarkPgBossW[]
      }
      queues: {
        resolveEpisodeQ: ResolveEpisodePgBossQ
        resolveArchiveQ: ResolveArchivePgBossQ
        resolveBookmarkQ: ResolveBookmarkPgBossQ
      }
    }
  }
}
