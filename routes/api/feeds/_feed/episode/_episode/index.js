import SQL from '@nearform/sql'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.basicAuth
      ], {
        relation: 'or'
      }),
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
      const feedTokenUser = request.feedTokenUser
      const userId = feedTokenUser?.userId ?? request?.user?.id
      if (!userId) return reply.unauthorized('Missing authenticated feed userId')

      const { feed: feedId, episode: episodeId } = request.params

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

      const cacheKey = {
        userId,
        episodeId: episode.id,
        sourceUrl: episode.src_url,
        type: episode.type,
        medium: episode.medium
      }

      const cachedUrl = fastify.memURLCache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(302, cachedUrl)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      const metadata = await fastify.pqueue.add(() => {
        return fastify.getYTDLPMetadata({
          url: episode.src_url,
          medium: episode.medium
        })
      })

      if (!metadata.url) throw new Error('metadata is missing url')

      fastify.memURLCache.set(cacheKey, metadata.url, metadata.url)
      reply.redirect(302, metadata.url)
    }
  )
}
