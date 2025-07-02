import type PgBoss from 'pg-boss'
import type {
  ResolveEpisodePgBossQ
} from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import type {
  ResolveArchivePgBossQ
} from '@breadcrum/resources/archives/resolve-archive-queue.js'
import type {
  ResolveBookmarkPgBossQ
} from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import type { ConstructorOptions } from 'pg-boss'

declare module 'fastify' {
  interface FastifyInstance {
    pgboss: {
      boss: PgBoss
      config: ConstructorOptions
      queues: {
        resolveEpisodeQ: ResolveEpisodePgBossQ
        resolveArchiveQ: ResolveArchivePgBossQ
        resolveBookmarkQ: ResolveBookmarkPgBossQ
      }
    }
  }
}
