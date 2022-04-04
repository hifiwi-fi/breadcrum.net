import SQL from '@nearform/sql'

const commnonBookmarkProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  note: { type: 'string' },
  starred: { type: 'boolean' },
  toread: { type: 'boolean' },
  sensitive: { type: 'boolean' },
  tags: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 }
      },
      required: ['name']
    }
  }
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

  // Create bookmark
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
          201: {
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
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { url, title, note, toread, sensitive, tags = [] } = request.body

        console.log(url, title, note, toread, sensitive, tags)

        const createBookmark = SQL`
        INSERT INTO bookmarks (url, title, note, toread, sensitive, owner_id) VALUES (
          ${url},
          ${title},
          ${note},
          ${toread || false},
          ${sensitive || false},
          ${userId}
        )
        RETURNING id, url, title, toread, sensitive, owner_id;`

        const results = await client.query(createBookmark)
        const bookmark = results.rows[0]

        if (tags.length > 0) {
          const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                tags.map(tag => SQL`(${tag.name},${userId})`),
                ' , '
              )}
          ON CONFLICT (name, owner_id)
          DO NOTHING
          returning id, name, created_at, updated_at;
          `

          console.log(createTags)

          const tagsResults = await client.query(createTags)

          const applyTags = SQL`
          INSERT INTO bookmarks_tags (bookmark_id, tag_id)
          VALUES
            ${SQL.glue(
              tagsResults.rows.map(tag => SQL`(${bookmark.id},${tag.id})`),
              ' , '
            )};
          `

          console.log(applyTags)

          await client.query(applyTags)
        }

        return {
          status: 'ok',
          site_url: `https://${fastify.config.domain}/bookmarks/b?id=${bookmark.id}`
        }
      })
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
  },
  async (request, reply) => {
    throw new Error('Not implemented')
  })
}
