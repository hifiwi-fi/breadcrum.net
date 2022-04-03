import SQL from '@nearform/sql'

const commnonBookmarkProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  note: { type: 'string' },
  starred: { type: 'boolean' },
  toread: { type: 'boolean' },
  sensitive: { type: 'boolean' }
}

const fullBookmarkProps = {
  id: { type: 'string', format: 'uuid' },
  ...commnonBookmarkProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
}

export default async function registerRoutes (fastify, opts) {
  fastify.get(
    '/bookmarks',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...fullBookmarkProps
                  }
                }
              }
            }
          }
        }

      }
    },
    async (request, reply) => {
      const id = request.user.id

      const query = SQL`
      SELECT id, url, title, note, created_at, updated_at, toread, sensitive
        FROM bookmarks
        WHERE owner_id = ${id}
      `

      const results = await fastify.pg.query(query)

      return {
        data: results.rows
      }
    }
  )

  // Create (update?) bookmark
  fastify.put(
    '/bookmarks',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            ...commnonBookmarkProps
          },
          required: ['url']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              site_url: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.id
      const { url, title, note, toread, sensitive } = request.body

      const query = SQL`
      INSERT INTO bookmarks (url, title, toread, sensitive, owner_id) VALUES (
        ${url},
        ${title},
        ${note},
        ${toread},
        ${sensitive}
        ${userId}
      )
      RETURNING id;`

      const results = await fastify.pg.query(query)
      const bookmark = results.rows[0]

      return {
        status: 'ok',
        site_url: `https://${fastify.config.domain}/bookmarks/b?id=${bookmark.id}`
      }
    }
  )

  fastify.get('/bookmarks/:id', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ...fullBookmarkProps
          }
        }
      }
    }
  },
  async (request, reply) => {
    const userId = request.user.id
    const { id: bookmarkId } = request.parms

    const query = SQL`
      SELECT id, url, title, note, toread, sensitive, created_at, updated_at
        FROM bookmarks
        WHERE owner_id = ${userId}
          AND id = ${bookmarkId}
        LIMIT 1;
      `

    const results = await fastify.pg.query(query)
    const bookmark = results.rows[0]

    return {
      ...bookmark
    }
  })

  fastify.put('/bookmarks/:id', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          ...commnonBookmarkProps
        },
        required: ['url']
      }
    }
  })
}
