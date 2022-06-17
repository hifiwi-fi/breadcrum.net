import SQL from '@nearform/sql'

const commnonBookmarkProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  note: { type: 'string' },
  starred: { type: 'boolean' },
  toread: { type: 'boolean' },
  sensitive: { type: 'boolean' },
  tags: {
    type: ['array', 'null'],
    items: {
      type: 'string', minLength: 1, maxLength: 255
    }
  }
}

const fullBookmarkProps = {
  id: { type: 'string', format: 'uuid' },
  ...commnonBookmarkProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
}

export default async function bookmarkRoutes (fastify, opts) {
  fastify.get(
    '/bookmarks',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time'
            },
            after: {
              type: 'string',
              format: 'date-time'
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20
            },
            url: {
              type: 'string',
              format: 'uri'
            },
            sensitive: {
              type: 'boolean',
              default: false
            }
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after'] } }] },
            after: { allOf: [{ not: { required: ['before'] } }] }
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
                    ...fullBookmarkProps
                  }
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: 'string', format: 'date-time' },
                  after: { type: 'string', format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' }
                }
              }
            }
          }
        }

      }
    },
    async (request, reply) => {
      const id = request.user.id
      let { before, after, per_page: perPage, url, sensitive } = request.query

      let top = false
      let bottom = false

      if (after) {
        // We have to fetch the first 2 rows because > is inclusive on timestamps (μS)
        // and we need to get the item before the next 'before' set.
        const perPageAfterOffset = perPage + 2

        const afterCalcQuery = SQL`
          WITH page as (
            SELECT id, url, title, created_at
            FROM bookmarks
                WHERE owner_id = ${id}
                  AND created_at >= ${after}
                  ${url ? SQL`AND url = ${url}` : SQL``}
                  ${!sensitive ? SQL`AND sensitive = false` : SQL``}
                ORDER BY
                  created_at ASC, title ASC, url ASC
                FETCH FIRST ${perPageAfterOffset} ROWS ONLY
          ),
          bookmark_with_last_row_date as (
            SELECT LAST_VALUE(page.created_at) OVER (
                  ORDER BY page.created_at
                  RANGE BETWEEN
                      UNBOUNDED PRECEDING AND
                      UNBOUNDED FOLLOWING
              ) last_created_at
            FROM page
          )
          SELECT COUNT(*)::int as bookmark_count, last_created_at
          FROM bookmark_with_last_row_date
          GROUP BY last_created_at
        `

        const results = await fastify.pg.query(afterCalcQuery)

        const { bookmark_count: bookmarkCount, last_created_at: lastCreatedAt } = results.rows.pop()

        if (bookmarkCount !== perPageAfterOffset) {
          top = true
          before = (new Date()).toISOString()
        } else {
          before = lastCreatedAt
        }
      }

      if (!before && !after) {
        top = true
        before = (new Date()).toISOString()
      }

      const query = SQL`
        SELECT id, url, title, note, created_at, updated_at, toread, sensitive, starred, t.tag_array as tags
        FROM bookmarks
        LEFT OUTER JOIN(
          SELECT bt.bookmark_id as id, jsonb_agg(t.name) as tag_array
          FROM bookmarks_tags bt
          JOIN tags t ON t.id = bt.tag_id
          GROUP BY bt.bookmark_id
        ) t using (id)
        WHERE owner_id = ${id}
          ${before ? SQL`AND created_at < ${before}` : SQL``}
          ${url ? SQL`AND url = ${url}` : SQL``}
          ${!sensitive ? SQL`AND sensitive = false` : SQL``}
        ORDER BY
          created_at DESC, title DESC, url DESC
        FETCH FIRST ${perPage} ROWS ONLY;
      `

      const results = await fastify.pg.query(query)

      if (results.rows.length !== perPage) bottom = true

      const nextPage = bottom ? null : results.rows.at(-1).created_at
      const prevPage = top ? null : results.rows[0]?.created_at || before

      return {
        data: results.rows,
        pagination: {
          before: nextPage,
          after: prevPage,
          top,
          bottom
        }
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
            // TODO: allow arrays of tag names
          },
          additionalProperties: false,
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
        const id = request.user.id
        const { url, title, note, toread, sensitive, tags = [] } = request.body

        const checkForExistingQuery = SQL`
        SELECT id, url
        FROM bookmarks
        WHERE owner_id = ${id}
          AND url = ${url};
        `

        const existingResults = await client.query(checkForExistingQuery)
        const maybeResult = existingResults.rows[0]

        if (existingResults.rows.length > 0) {
          reply.redirect(301, `/api/bookmarks/${maybeResult.id}`)
          return {
            status: 'bookmark exists'
          }
        }

        const createBookmark = SQL`
        INSERT INTO bookmarks (url, title, note, toread, sensitive, owner_id) VALUES (
          ${url},
          ${title},
          ${note},
          ${toread || false},
          ${sensitive || false},
          ${id}
        )
        RETURNING id, url, title, toread, sensitive, owner_id;`

        const results = await client.query(createBookmark)
        const bookmark = results.rows[0]

        if (tags.length > 0) {
          const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                tags.map(tag => SQL`(${tag},${id})`),
                ' , '
              )}
          ON CONFLICT (name, owner_id)
          DO UPDATE
            SET name = EXCLUDED.name
          returning id, name, created_at, updated_at;
          `

          const tagsResults = await client.query(createTags)

          const applyTags = SQL`
          INSERT INTO bookmarks_tags (bookmark_id, tag_id)
          VALUES
            ${SQL.glue(
              tagsResults.rows.map(tag => SQL`(${bookmark.id},${tag.id})`),
              ' , '
            )};
          `

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
    const { id: bookmarkId } = request.params

    const query = SQL`
      SELECT id, url, title, note, created_at, updated_at, toread, sensitive, starred, t.tag_array as tags
        FROM bookmarks
        LEFT OUTER JOIN(
          SELECT bt.bookmark_id as id, jsonb_agg(t.name) as tag_array
          FROM bookmarks_tags bt
          JOIN tags t ON t.id = bt.tag_id
          GROUP BY bt.bookmark_id
        ) t using (id)
        WHERE owner_id = ${userId}
          AND id = ${bookmarkId}
        LIMIT 1;
      `

    const results = await fastify.pg.query(query)
    const bookmark = results.rows[0]
    if (!bookmark) {
      reply.code(404)
      return {
        status: 'bookmark id not found'
      }
    }
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
        minProperties: 1,
        additionalProperties: false
      }
    }
  },
  async (request, reply) => {
    return fastify.pg.transact(async client => {
      const userId = request.user.id
      const bookmarkId = request.params.id
      const bookmark = request.body

      const updates = []

      if (bookmark.url != null) updates.push(SQL`url = ${bookmark.url}`)
      if (bookmark.title != null) updates.push(SQL`title = ${bookmark.title}`)
      if (bookmark.note != null) updates.push(SQL`note = ${bookmark.note}`)
      if (bookmark.starred != null) updates.push(SQL`starred = ${bookmark.starred}`)
      if (bookmark.toread != null) updates.push(SQL`toread = ${bookmark.toread}`)
      if (bookmark.sensitive != null) updates.push(SQL`sensitive = ${bookmark.sensitive}`)

      if (updates.length > 0) {
        const query = SQL`
          UPDATE bookmarks
          SET ${SQL.glue(updates, ' , ')}
          WHERE id = ${bookmarkId}
            AND owner_id =${userId};
          `

        await client.query(query)
      }

      if (bookmark.tags?.length > 0) {
        const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                bookmark.tags.map(tag => SQL`(${tag},${userId})`),
                ' , '
              )}
          ON CONFLICT (name, owner_id)
          DO UPDATE
            SET name = EXCLUDED.name
          returning id, name, created_at, updated_at;
          `

        const tagsResults = await client.query(createTags)

        const applyTags = SQL`
          INSERT INTO bookmarks_tags (bookmark_id, tag_id)
          VALUES
            ${SQL.glue(
              tagsResults.rows.map(tag => SQL`(${bookmarkId},${tag.id})`),
              ' , '
            )}
          ON CONFLICT (bookmark_id, tag_id)
          DO NOTHING;
          `

        await client.query(applyTags)

        const removeOldTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
            AND tag_id NOT IN (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

        await client.query(removeOldTags)
      }

      return {
        status: 'ok'
      }
    })
  })

  fastify.delete('/bookmarks/:id', {
    preHandler: fastify.auth([fastify.verifyJWT]),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  },
  async (request, reply) => {
    const userId = request.user.id
    const bookmarkId = request.params.id

    const query = SQL`
      DELETE from bookmarks
      WHERE id = ${bookmarkId}
        AND owner_id =${userId};
      `

    await fastify.pg.query(query)

    reply.status = 202
    return {
      status: 'ok'
    }
  })
}
