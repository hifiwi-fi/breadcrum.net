import { fullBookmarkPropsWithEpisodes } from './mixed-bookmark-props.js'
import { getBookmarksQuery, afterToBeforeBookmarkQuery } from './get-bookmarks-query.js'

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
        after,
        per_page: perPage,
        url,
        tag,
        sensitive,
        starred,
        toread
      } = request.query
      let {
        before
      } = request.query

      let top = false
      let bottom = false

      if (after) {
        // We have to fetch the first 2 rows because > is inclusive on timestamps (μS)
        // and we need to get the item before the next 'before' set.
        const perPageAfterOffset = perPage + 2
        const afterCalcQuery = afterToBeforeBookmarkQuery({
          perPage,
          tag,
          ownerId: userId,
          after,
          sensitive,
          starred,
          toread
        })

        const results = await fastify.pg.query(afterCalcQuery)

        const { bookmark_count: bookmarkCount, last_created_at: lastCreatedAt } = results.rows.pop() ?? {}

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

      const bookmarkQuery = getBookmarksQuery({
        tag,
        ownerId: userId,
        before,
        url,
        sensitive,
        starred,
        toread,
        perPage
      })

      const results = await fastify.pg.query(bookmarkQuery)

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
}
