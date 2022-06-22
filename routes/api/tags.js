import SQL from '@nearform/sql'

export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/tags',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            sensitive: {
              type: 'boolean',
              default: false
            }
          }
        }
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
                  count: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    },
    async function (request, reply) {
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
        data: results.rows
      }
    }
  )

  fastify.delete(
    '/tags/:name',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        }
      }
    },
    async function (request, reply) {
      const userId = request.user.id
      const tagName = request.params.name

      const query = SQL`
        delete from tags
        where name = ${tagName}
          AND owner_id =${userId};
      `

      await fastify.pg.query(query)

      reply.status = 202
      return {
        status: 'ok'
      }
    }
  )

  fastify.post(
    '/tags/rename',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            old: { type: 'string', minLength: 1, maxLength: 255 },
            new: { type: 'string', minLength: 1, maxLength: 255 }
          },
          required: ['name']
        }
      }
    },
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )

  fastify.post(
    '/tags/merge',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            source: {
              type: ['array', 'null'],
              items: {
                type: 'string', minLength: 1, maxLength: 255
              }
            },
            target: { type: 'string', minLength: 1, maxLength: 255 }
          },
          required: ['name']
        }
      }
    },
    async function (request, reply) {
      throw new Error('not implemented')
    }
  )
}
