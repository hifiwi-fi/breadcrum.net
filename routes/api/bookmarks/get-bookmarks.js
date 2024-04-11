import { fullBookmarkPropsWithEpisodes } from './mixed-bookmark-props.js'
import { getBookmarksQuery } from './get-bookmarks-query.js'

export async function getBookmarks (fastify, opts) {
  fastify.get(
    '/',
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
            tag: {
              type: 'string', minLength: 1, maxLength: 255
            },
            sensitive: {
              type: 'boolean',
              default: false
            },
            starred: {
              type: 'boolean',
              default: false
            },
            toread: {
              type: 'boolean',
              default: false
            }
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] }
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
                    ...fullBookmarkPropsWithEpisodes
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
    // Get Bookmarks
    async function getBookmarksHandler (request, reply) {
      const userId = request.user.id
      const {
        before,
        after,
        per_page: perPage,
        url,
        tag,
        sensitive,
        starred,
        toread
      } = request.query

      const bookmarkQuery = getBookmarksQuery({
        tag,
        ownerId: userId,
        before,
        after,
        url,
        sensitive,
        starred,
        toread,
        perPage: perPage + 1
      })

      const results = await fastify.pg.query(bookmarkQuery)

      const top = Boolean(
        (!before && !after) ||
        (after && results.rows.length <= perPage)
      )
      const bottom = Boolean(
        (before && results.rows.length <= perPage) ||
        (!before && !after && results.rows.length <= perPage)
      )

      if (results.rows.length > perPage) {
        if (after) {
          results.rows.shift()
        } else {
          results.rows.pop()
        }
      }

      const nextPage = bottom ? null : results.rows.at(-1)?.created_at
      const prevPage = top ? null : addMillisecond(results.rows[0]?.created_at)

      const response = {
        data: results.rows,
        pagination: {
          before: nextPage,
          after: prevPage,
          top,
          bottom
        }
      }

      return response
    }
  )
}

function addMillisecond (dateObj) {
  return new Date(dateObj.getTime() + 1)
}
