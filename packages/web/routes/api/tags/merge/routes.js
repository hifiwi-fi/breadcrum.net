/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import { mergeTags } from '../tag-actions.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function tagsMergeRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        hide: true, // TODO: remove when implemented
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            source: {
              type: ['array'],
              minItems: 1,
              items: {
                type: 'string', minLength: 1, maxLength: 255,
              },
            },
            target: { type: 'string', minLength: 1, maxLength: 255 },
          },
          required: ['source', 'target'],
        },
        response: {
          202: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['ok'] },
            },
          },
        },
      },
    },
    async function mergeTagsHandler (request, reply) {
      const result = await mergeTags(fastify, {
        userId: request.user.id,
        sourceNames: request.body.source,
        targetName: request.body.target,
      })

      if (!result.ok) {
        if (result.statusCode === 404) return reply.notFound(result.message)
        if (result.statusCode === 409) return reply.conflict(result.message)
        return reply.unprocessableEntity(result.message)
      }

      reply.status(202)
      return /** @type {const} */ ({
        status: 'ok',
      })
    }
  )
}
