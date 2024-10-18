import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
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
      const tagName = request.params.name

      const query = SQL`
        delete from tags
        where name = ${tagName}
          AND owner_id =${userId};
      `

      await fastify.pg.query(query)

      reply.status(202)
      return {
        status: 'ok',
      }
    }
  )
}
