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
      const feedTokenUser = request.feedTokenUser
      const userId = feedTokenUser?.userId ?? request?.user?.id
      if (!userId) return reply.unauthorized('Missing authenticated feed userId')

      const cacheKey = 'breadcrum:files:placeholder'
      const cachedUrl = fastify.memURLCache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(302, cachedUrl)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      const metadata = await fastify.pqueue.add(async () => {
        const flags = await fastify.getFlags({ frontend: false, backend: true })
        return await fastify.getYTDLPMetadata({
          url: flags.placeholder_url,
          medium: 'video'
        })
      })

      if (!metadata.url) throw new Error('metadata is missing url')

      fastify.memURLCache.set(cacheKey, metadata.url, metadata.url)
      reply.redirect(302, metadata.url)
    }
  )
}
