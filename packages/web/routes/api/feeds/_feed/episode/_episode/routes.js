import SQL from '@nearform/sql'
import { YTDLPAPIError } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { FastifyRequest, FastifyBaseLogger } from 'fastify'
 */

/**
 * @typedef {Object} FeedTokenUser
 * @property {string} userId - The authenticated user ID from feed token
 * @property {string} username - The authenticated username
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
      const requestLogger = /** @type {FastifyBaseLogger & {setBindings?: (bindings: Record<string, unknown>) => void}} */ (request.log)
      requestLogger.setBindings?.(feedTokenUser
        ? { episodeId }
        : { feedId, episodeId })

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
      const clientGeoip = fastify.geoip?.lookup(request.ip)
      const mediaRequestLog = {
        sourceUrl: episode.src_url,
        medium: episode.medium,
        authenticationType: feedTokenUser ? 'feed-token' : 'jwt',
        clientIp: request.ip,
        clientGeoip: clientGeoip
          ? {
              countryIso: clientGeoip.country_iso,
              regionIso: clientGeoip.region_iso,
              regionName: clientGeoip.region_name,
              timeZone: clientGeoip.time_zone,
            }
          : null,
        userAgent: request.headers['user-agent'] ?? null,
        range: request.headers.range ?? null,
      }

      if (cachedUrl) {
        request.log.info({
          ...mediaRequestLog,
          cacheStatus: 'hit',
          mediaHost: new URL(cachedUrl).hostname,
        }, 'redirecting episode request to cached media URL')
        reply.header('fly-cache-status', 'HIT')
        return reply.redirect(cachedUrl, 302)
      } else {
        request.log.info({
          ...mediaRequestLog,
          cacheStatus: 'miss',
        }, 'resolving episode media URL')
        reply.header('fly-cache-status', 'MISS')
      }

      let metadata
      try {
        metadata = await fastify.getYTDLPMetadataWrapper({
          url: episode.src_url,
          medium: episode.medium,
          parentRequestId: request.id,
        })
      } catch (err) {
        if (err instanceof YTDLPAPIError) {
          const logPayload = {
            ...mediaRequestLog,
            err,
            cacheStatus: 'miss',
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
      request.log.info({
        ...mediaRequestLog,
        cacheStatus: 'miss',
        mediaHost: new URL(metadata.url).hostname,
      }, 'redirecting episode request to resolved media URL')
      reply.redirect(metadata.url, 302)
    }
  )
}
