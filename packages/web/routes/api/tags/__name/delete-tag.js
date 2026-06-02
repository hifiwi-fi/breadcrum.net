import { deleteTagByName } from '../tag-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteTag (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    async function deleteTagHandler (request, reply) {
      const userId = request.user.id
      const result = await deleteTagByName(fastify, {
        userId,
        name: request.params.name,
      })

      if (!result.ok) {
        if (result.statusCode === 404) return reply.notFound(result.message)
        return reply.unprocessableEntity(result.message)
      }

      reply.status(202)
      return {
        status: 'ok',
      }
    }
  )
}
