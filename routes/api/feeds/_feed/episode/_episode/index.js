import SQL from '@nearform/sql'
import { getYTDLPUrl } from '../../../../../../lib/run-yt-dlp.js'
import { cache } from '../../../../../../lib/temp-cache.js'
import { getFileKey } from '../../../../../../lib/file-key.js'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth]),
      schema: {
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid'
            },
            episodes: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['feed', 'episode']
        }
      }
    },
    async function episodeHandler (request, reply) {
      const { userId } = request.feedTokenUser
      const { feed: feedId, episode: episodeId } = request.params
      if (!userId) throw new Error('missing authenticated feed userId')

      const episodeQuery = SQL`
          select
            e.id,
            e.created_at,
            e.updated_at,
            e.url as src_url,
            e.type,
            e.medium,
            e.size_in_bytes,
            e.duration_in_seconds,
            e.mime_type,
            e.explicit,
            e.author_name,
            e.filename,
            e.ext,
            e.src_type,
            e.ready,
            bm.id as bookmark_id,
            bm.url as bookmark_url,
            bm.title,
            bm.note
          from episodes e
          join bookmarks bm
          on bm.id = e.bookmark_id
          where e.owner_id = ${userId}
          and bm.owner_id = ${userId}
          and e.podcast_feed_id = ${feedId}
          and e.ready = true
          and e.error is null
          and e.id = ${episodeId}
          fetch first 1 rows only;
        `

      const results = await fastify.pg.query(episodeQuery)
      const episode = results.rows.pop()

      if (!episode) {
        return reply.notFound(`episide ${episodeId} not found in feed ${feedId}`)
      }

      const cacheKey = getFileKey({
        userId,
        episodeId: episode.id,
        sourceUrl: episode.src_url,
        type: episode.type,
        medium: episode.medium
      })

      const cachedUrl = cache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(302, cachedUrl)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      const metadata = await fastify.pqueue.add(() => {
        return getYTDLPUrl({ apiURL: fastify.config.YT_DLP_API_URL, url: episode.src_url, medium: episode.medium, histogram: fastify.metrics.ytdlpSeconds })
      })

      if (!metadata.url) throw new Error('metadata is missing url')

      cache.set(cacheKey, metadata.url, metadata.url)
      reply.redirect(302, metadata.url)
    }
  )
}
