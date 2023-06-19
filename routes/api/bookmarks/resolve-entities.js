import { JSDOM } from 'jsdom'
import { resolveArchive } from '../archives/resolve-archive.js'
import { resolveEpisode } from '../episodes/resolve-episode.js'
import { resolveBookmark } from './resolve-bookmark.js'

export async function resolveEntities ({
  fastify,
  pg,
  log,
  userId,
  resolveMeta,
  archive,
  episode,
  url,
  title,
  tags,
  summary,
  bookmarkId,
  archiveId,
  archiveURL,
  episodeId,
  episodeURL,
  episodeMedium
}) {
  pg = pg ?? fastify.pg
  log = log ?? fastify.log

  try {
    const work = []

    if (resolveMeta || archive) {
      const html = await fastify.fetchHTML({ url })
      const initialDocument = (new JSDOM(html, { url })).window.document

      if (resolveMeta) {
        work.push(
          resolveBookmark({ fastify, pg, log, userId, bookmarkId, url, title, tags, summary, initialDocument })
        )
      }

      if (archive) {
        work.push(resolveArchive({ fastify, pg, log, userId, archiveId, url: archiveURL, initialDocument }))
      }
    }

    if (episode) {
      work.push(resolveEpisode({ fastify, pg, log, userId, bookmarkTitle: title, episodeId, url: episodeURL, medium: episodeMedium }))
    }

    const results = await Promise.allSettled(work)

    log.info({ results }, 'bookmark entities resolved')
  } catch (err) {
    log.error(`Error resolving entities: Bookmark ${bookmarkId} Archive ${archiveId} Episode ${episodeId}`)
    log.error(err)
  }
}
