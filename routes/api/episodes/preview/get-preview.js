/* eslint-disable camelcase */
import { resolveType } from '../resolve-episode.js'

export async function getPreview (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled
      ], {
        relation: 'and'
      }),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            medium: { enum: ['video', 'audio'], default: 'video' },
            url: { type: 'string', format: 'uri' }
          },
          required: ['url']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              title: {
                type: 'string'
              },
              ext: {
                type: 'string'
              },
              url: {
                type: 'string'
              },
              duration: {
                type: 'number'
              },
              channel: {
                type: 'string'
              },
              src_type: {
                type: 'string'
              },
              filesize_approx: {
                type: 'number'
              }
            }
          }
        }
      }
    },
    async function getPreviewHandler (request, reply) {
      const { url, medium } = request.query
      const metadata = await fastify.getYTDLPMetadata({ url, medium })

      const {
        title,
        ext,
        duration,
        channel,
        filesize_approx
      } = metadata
      const src_type = resolveType(metadata)

      // TODO: what are we doing here
      return {
        title,
        ext,
        url: metadata.url,
        duration,
        channel,
        src_type,
        filesize_approx
      }
    }
  )
}
