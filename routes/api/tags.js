import SQL from '@nearform/sql'

export default async function tagsRoutes (fastify, opts) {
  fastify.get(
    '/tags',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {},
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

      const query = SQL`
        select name, created_at, count(bookmarks_tags.tag_id) as count
        from tags
        left outer join bookmarks_tags on (tags.id = bookmarks_tags.tag_id)
        where owner_id = ${userId}
        group by (name, created_at)
        order by created_at desc;
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
