import SQL from '@nearform/sql'
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
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function podcastFeedsRoutes (fastify, _opts) {
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
        params: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid',
            },
            episodes: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['feed', 'episode'],
        },
      },
    },
    async function episodeHandler (request, reply) {
      const feedTokenUser = /** @type {FeedAuthRequest} */ (request).feedTokenUser
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
        medium: episode.medium,
      }

      const cachedUrl = await fastify.urlCache.get(cacheKey)

      if (cachedUrl) {
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(cachedUrl, 302)
      } else {
        reply.header('fly-cache-status', 'MISS')
      }

      let metadata
      try {
        metadata = await fastify.getYTDLPMetadataWrapper({
          url: episode.src_url,
          medium: episode.medium,
        })
      } catch (err) {
        if (err instanceof YTDLPAPIError) {
          const logPayload = {
            err,
            episodeId,
            feedId,
            sourceUrl: episode.src_url,
            ytDlpStatusCode: err.statusCode,
            ytDlpDescription: err.description,
          }

          if (err.retryable) {
            request.log.warn(logPayload, 'yt-dlp-api is temporarily unable to resolve episode media')
            return reply.code(503).send({
              statusCode: 503,
              error: 'Service Unavailable',
              message: 'Episode media is not currently available. Try again later.',
            })
          }

          request.log.info(logPayload, 'yt-dlp-api failed to resolve episode media')
          return reply.code(424).send({
            statusCode: 424,
            error: 'Failed Dependency',
            message: 'Episode media could not be resolved from its source URL.',
          })
        }

        throw err
      }

      if (!metadata.url) throw new Error('metadata is missing url')

      await fastify.urlCache.set(cacheKey, metadata.url)
      reply.redirect(metadata.url, 302)
    }
  )
}
