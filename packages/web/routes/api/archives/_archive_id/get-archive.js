import { getArchivesQuery } from '../archive-query-get.js'
import { fullArchivePropsWithBookmark } from '../mixed-archive-props.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getArchive (fastify, _opts) {
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
            type: 'object',
            properties: {
              ...fullArchivePropsWithBookmark,
            },
          },
        },
      },
    },
    async function getArchiveHandler (request, reply) {
      const ownerId = request.user.id
      const { archive_id: archiveId } = request.params
      const { sensitive } = request.query

      const archiveQuery = getArchivesQuery({
        ownerId,
        archiveId,
        sensitive,
        perPage: 1,
        fullArchives: true,
      })

      const results = await fastify.pg.query(archiveQuery)
      const archive = results.rows[0]

      if (!archive) {
        return reply.notFound('archive_id not found')
      }

      return {
        ...archive,
      }
    }
  )
}
