import { fullArchivePropsWithBookmark } from './mixed-archive-props.js'
import { getArchivesQuery } from './archive-query-get.js'
import { addMillisecond } from '../bookmarks/addMillisecond.js'

export async function getArchives (fastify, opts) {
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
              maximum: 50,
              default: 20
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
            },
            full_archives: {
              type: 'boolean',
              default: false
            },
            bookmark_id: {
              type: 'string',
              format: 'uuid'
            },
            ready: {
              type: 'boolean'
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
                    ...fullArchivePropsWithBookmark
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
    async function getArchivesHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const {
          before,
          after,
          per_page: perPage,
          sensitive,
          toread,
          starred,
          ready,
          bookmark_id: bookmarkId
        } = request.query

        const archivesQuery = getArchivesQuery({
          ownerId: userId,
          bookmarkId,
          before,
          after,
          sensitive,
          toread,
          starred,
          ready,
          perPage: perPage + 1,
          fullArchives: request.query.full_archives
        })

        const results = await fastify.pg.query(archivesQuery)

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
      })
    }
  )
}
