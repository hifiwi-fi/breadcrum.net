import { renameTag } from '../tag-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function tagsRenameRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        hide: true,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            old: { type: 'string', minLength: 1, maxLength: 255 },
            new: { type: 'string', minLength: 1, maxLength: 255 },
          },
          required: ['old', 'new'],
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
    async function renameTagHandler (request, reply) {
      const result = await renameTag(fastify, {
        userId: request.user.id,
        oldName: request.body.old,
        newName: request.body.new,
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
