/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function podcastFeedsRoutes (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.basicAuth,
      ], {
        relation: 'or',
      }),
      schema: {
        tags: ['feeds', 'episodes'],
        hide: true,
        params: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['feed'],
        },
      },
    },
    async function placeholderHandler (request, reply) {
      const feedTokenUser = request.feedTokenUser
      const userId = feedTokenUser?.userId ?? request?.user?.id
      if (!userId) return reply.unauthorized('Missing authenticated feed userId')

      const cacheKey = 'breadcrum:files:placeholder'
      const cachedUrl = await fastify.cache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(cachedUrl, 302)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      const flags = await fastify.getFlags({ frontend: false, backend: true })
      const metadata = await fastify.getYTDLPMetadataWrapper({
        url: flags.placeholder_url,
        medium: 'video',
      })

      if (!metadata.url) throw new Error('metadata is missing url')

      await fastify.cache.set(cacheKey, metadata.url, 1000 * 60 * 5) // 20 mins
      reply.redirect(metadata.url, 302)
    }
  )
}
