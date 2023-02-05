import { getYTDLPUrl } from '../../../../../../lib/run-yt-dlp.js'
import { cache } from '../../../../../../lib/temp-cache.js'

const PLACEHOLDER_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth]),
      schema: {
        hide: true,
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['feed']
        }
      }
    },
    async function placeholderHandler (request, reply) {
      const { userId } = request.feedTokenUser
      if (!userId) throw new Error('missing authenticated feed userId')

      const cacheKey = 'breadcrum:files:placeholder'
      const cachedUrl = cache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(302, cachedUrl)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      const metadata = await fastify.pqueue.add(() => {
        return getYTDLPUrl({ apiURL: fastify.config.YT_DLP_API_URL, url: PLACEHOLDER_URL, medium: 'video', histogram: fastify.metrics.ytdlpSeconds })
      })

      if (!metadata.url) throw new Error('metadata is missing url')

      cache.set(cacheKey, metadata.url, metadata.url)
      reply.redirect(302, metadata.url)
    }
  )
}
