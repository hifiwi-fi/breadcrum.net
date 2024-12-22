import { getArchive } from '../archive-query-get.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaArchiveRead } from '../schemas/schema-archive-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *   references: [ SchemaArchiveRead ],
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
 * }>}
 */
export async function getArchiveRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['archives'],
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false,
            },
          },
        },
        params: {
          type: 'object',
          properties: {
            archive_id: { type: 'string', format: 'uuid' },
          },
          required: ['archive_id'],
        },
        response: {
          200: {
            $ref: 'schema:breadcrum:archive:read',
          },
        },
      },
    },
    async function getArchiveHandler (request, reply) {
      const ownerId = request.user.id
      const { archive_id: archiveId } = request.params
      const { sensitive } = request.query

      const archive = await getArchive({
        fastify,
        ownerId,
        archiveId,
        sensitive,
        perPage: 1,
        fullArchives: true,
      })

      if (!archive) {
        return reply.notFound('archive_id not found')
      }

      return {
        ...archive,
      }
    }
  )
}
