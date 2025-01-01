import type { FastifyRequest } from 'fastify'
import type { Queue } from 'bullmq'
import type {
  ResolveEpisodeQ,
} from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import type {
  ResolveArchiveQ,
} from '@breadcrum/resources/archives/resolve-archive-queue.js'
import type {
  ResolveBookmarkQ,
} from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      resolveEpisodeQ: ResolveEpisodeQ
      resolveArchiveQ: ResolveArchiveQ
      resolveBookmarkQ: ResolveBookmarkQ
    }
  }
}
