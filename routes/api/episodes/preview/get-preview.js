/* eslint-disable camelcase */

export async function getPreview (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            medium: { enum: ['video', 'audio'], default: 'video' },
            url: { type: 'string', format: 'uri' }
          },
          required: ['url']
        }
      }
    },
    async function getPreviewHandler (request, reply) {
      const { url, medium } = request.query
      return await fastify.getYTDLPMetadata({ url, medium })
    }
  )
}
