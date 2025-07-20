import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getTags (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['tags'],
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async function getTagsHandler (request, _reply) {
      const userId = request.user.id
      const { sensitive } = request.query

      const query = SQL`
        select tags.name, tags.created_at, count(bookmarks_tags.tag_id) as count
        from tags
        left outer join bookmarks_tags on (tags.id = bookmarks_tags.tag_id)
        left outer join bookmarks on (bookmarks_tags.bookmark_id = bookmarks.id)
        where tags.owner_id = ${userId}
        ${!sensitive ? SQL`AND sensitive = false` : SQL``}
        group by (tags.name, tags.created_at)
        order by tags.created_at desc;
      `

      const results = await fastify.pg.query(query)

      return {
        data: results.rows,
      }
    }
  )
}
