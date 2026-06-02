import { updateArchive } from '../archive-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaArchiveUpdate } from '../schemas/schema-archive-update.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function putArchiveRoute (fastify, _opts) {
  fastify.put('/', {
    preHandler: fastify.auth([
      fastify.verifyJWT,
      fastify.notDisabled,
    ], {
      relation: 'and',
    }),
    schema: {
      tags: ['archives'],
      querystring: {},
      params: {
        type: 'object',
        properties: {
          archive_id: { type: 'string', format: 'uuid' },
        },
        required: ['archive_id'],
      },
      body: /** @type { SchemaArchiveUpdate } */ (fastify.getSchema('schema:breadcrum:archive:update')),
    },
  },
  async function putArchiveHandler (request, _reply) {
    const ownerId = request.user.id
    const { archive_id: archiveId } = request.params

    return updateArchive(fastify, {
      userId: ownerId,
      archiveId,
      archive: request.body,
    })
  })
}
