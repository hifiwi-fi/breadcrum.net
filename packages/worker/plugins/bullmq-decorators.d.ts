import type { FastifyRequest } from 'fastify';
import type { Worker } from 'bullmq'

import type {
  ResolveBookmarkW,
} from '@breadcrum/resources/bookmarks/resolve-bookmark-queue.js'
import type {
  ResolveEpisodeQ,
  ResolveEpisodeW,
} from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import type {
  ResolveArchiveW,
} from '@breadcrum/resources/archives/resolve-archive-queue.js'

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      resolveEpisodeQ: ResolveEpisodeQ
    }
    workers: {
      resolveEpisodeW: ResolveEpisodeW
      resolveArchiveW: ResolveArchiveW
      resolveBookmarkW: ResolveBookmarkW
    }
  }
}
