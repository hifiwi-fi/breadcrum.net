import { updateEpisode } from '../episode-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaEpisodeUpdate } from '../schemas/schema-episode-update.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function putEpisode (fastify, _opts) {
  fastify.put('/', {
    preHandler: fastify.auth([
      fastify.verifyJWT,
      fastify.notDisabled,
    ], {
      relation: 'and',
    }),
    schema: {
      tags: ['episodes'],
      querystring: {},
      params: {
        type: 'object',
        properties: {
          episode_id: { type: 'string', format: 'uuid' },
        },
        required: ['episode_id'],
      },
      body: /** @type {SchemaEpisodeUpdate} */ (fastify.getSchema('schema:breadcrum:episode:update')),
    },
  },
  async function putEpisodeHandler (request, _reply) {
    const ownerId = request.user.id
    const { episode_id: episodeId } = request.params

    return updateEpisode(fastify, {
      userId: ownerId,
      episodeId,
      episode: request.body,
    })
  })
}
