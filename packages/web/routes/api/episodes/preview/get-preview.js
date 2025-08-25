/* eslint-disable camelcase */
import { resolveType } from '@breadcrum/resources/episodes/resolve-type.js'
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
          200: schemaEpisodePreview
        },
      },
    },
    async function getPreviewHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      const { url } = request.query
      /** @type {MediumTypes} */
      const medium = request.query.medium
      const metadata = await fastify.getYTDLPMetadataWrapper({ url, medium })

      const {
        title,
        ext,
        duration,
        channel,
        filesize_approx,
      } = metadata
      const src_type = resolveType(metadata)

      // TODO: what are we doing here
      /** @type{ReturnBody} */
      const returnBody = {
        title: title ?? null,
        ext: ext ?? null,
        url: metadata.url,
        duration: duration ?? null,
        channel: channel ?? null,
        src_type: src_type ?? null,
        filesize_approx: filesize_approx ?? null,
      }

      return returnBody
    }
  )
}
