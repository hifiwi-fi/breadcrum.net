import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function putArchive (fastify, _opts) {
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
      body: {
        type: 'object',
        $ref: 'schema:breadcrum:archive:base',
        minProperties: 1,
        // additionalProperties: false,
      },
    },
  },
  async function putArchiveHandler (request, reply) {
    return fastify.pg.transact(async client => {
      const ownerId = request.user.id
      const { archive_id: archiveId } = request.params
      const archive = request.body

      const updates = []

      // if (archive.url != null) updates.push(SQL`url = ${archive.url}`)
      if (archive.title != null) updates.push(SQL`title = ${archive.title}`)
      // TODO: the rest

      if (updates.length > 0) {
        const query = SQL`
          update archives
          set ${SQL.glue(updates, ' , ')}
          where id = ${archiveId}
          and owner_id =${ownerId};
          `

        await client.query(query)
      }

      fastify.metrics.archiveEditCounter.inc()

      return {
        status: 'ok',
      }
    })
  })
}
