/* eslint-disable camelcase */
import { resolveType } from '@breadcrum/resources/episodes/resolve-type.js'
import { getYTDLPDiscoveryMetadata, YTDLPAPIError } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
import { schemaEpisodePreview } from '../schemas/episode-preview.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { MediumTypes } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getPreview (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        tags: ['episodes'],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            medium: { enum: ['video', 'audio'], default: 'video' },
            url: { type: 'string', format: 'uri' },
          },
          required: ['url'],
        },
        response: {
          200: schemaEpisodePreview,
          424: {
            type: 'object',
            required: ['statusCode', 'error', 'message'],
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            required: ['statusCode', 'error', 'message'],
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async function getPreviewHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      const { url } = request.query
      /** @type {MediumTypes} */
      const medium = request.query.medium
      let metadata
      try {
        metadata = await getYTDLPDiscoveryMetadata({
          url,
          medium,
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          attempt: 0,
          cache: fastify.ytdlpCache,
        })
      } catch (err) {
        if (err instanceof YTDLPAPIError) {
          const logPayload = {
            err,
            sourceUrl: url,
            medium,
            ytDlpStatusCode: err.statusCode,
            ytDlpDescription: err.description,
          }

          if (err.retryable) {
            request.log.warn(logPayload, 'yt-dlp-api is temporarily unable to resolve episode preview')
            return reply.code(503).send({
              statusCode: 503,
              error: 'Service Unavailable',
              message: 'Episode preview is not currently available. Try again later.',
            })
          }

          request.log.info(logPayload, 'yt-dlp-api failed to resolve episode preview')
          return reply.code(424).send({
            statusCode: 424,
            error: 'Failed Dependency',
            message: 'Episode preview could not be resolved from its source URL.',
          })
        }

        throw err
      }

      const {
        title,
        ext,
        duration,
        channel,
        filesize_approx,
      } = metadata
      const src_type = resolveType(metadata)

      /** @type{ReturnBody} */
      const returnBody = {
        title: title ?? null,
        ext: ext ?? null,
        duration: duration ?? null,
        channel: channel ?? null,
        src_type: src_type ?? null,
        filesize_approx: filesize_approx ?? null,
      }

      return returnBody
    }
  )
}
