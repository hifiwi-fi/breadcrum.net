import { deleteEpisodeById } from '../episode-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteEpisode (fastify, _opts) {
  fastify.delete('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      tags: ['episodes'],
      params: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', format: 'uuid' },
        },
        required: ['episode_id'],
      },
    },
  },
  async function deleteEpisodeHandler (request, reply) {
    const ownerId = request.user.id
    const episodeId = request.params.episode_id

    const result = await deleteEpisodeById(fastify, { userId: ownerId, episodeId })
    reply.status(202)

    return result
  })
}
