import { YTDLPAPIError } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { FastifyRequest } from 'fastify'
 */

/**
 * @typedef {Object} FeedTokenUser
 * @property {string} userId - The authenticated user ID from feed token
 * @property {string} token - The feed token
 */

/**
 * Augment FastifyRequest to include feedTokenUser property
 * @typedef {FastifyRequest & { feedTokenUser?: FeedTokenUser }} FeedAuthRequest
 */

/**
 *
 * Handles placeholder episode routes for podcast feeds
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function placeholderRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        [fastify.verifyJWT, fastify.notDisabled],
        [fastify.basicAuth, fastify.notDisabled],
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
      const feedTokenUser = /** @type {FeedAuthRequest} */ (request).feedTokenUser
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
      const placeholderUrl = flags['placeholder_url']

      let metadata
      try {
        metadata = await fastify.getYTDLPMetadataWrapper({
          url: placeholderUrl,
          medium: 'video',
        })
      } catch (err) {
        if (err instanceof YTDLPAPIError) {
          const logPayload = {
            err,
            feedId: request.params.feed,
            placeholderUrl,
            ytDlpStatusCode: err.statusCode,
            ytDlpDescription: err.description,
          }

          if (err.retryable) {
            request.log.warn(logPayload, 'yt-dlp-api is temporarily unable to resolve placeholder media')
            return reply.code(503).send({
              statusCode: 503,
              error: 'Service Unavailable',
              message: 'Placeholder media is not currently available. Try again later.',
            })
          }

          request.log.info(logPayload, 'yt-dlp-api failed to resolve placeholder media')
          return reply.code(424).send({
            statusCode: 424,
            error: 'Failed Dependency',
            message: 'Placeholder media could not be resolved from its source URL.',
          })
        }

        throw err
      }

      if (!metadata.url) throw new Error('metadata is missing url')

      await fastify.cache.set(cacheKey, metadata.url, 1000 * 60 * 5) // 20 mins
      reply.redirect(metadata.url, 302)
    }
  )
}
