import { fullArchivePropsWithBookmark } from './mixed-archive-props.js'
import { getArchivesQuery, afterToBeforeArchivesQuery } from './archive-query-get.js'

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
            full_archives: {
              type: 'boolean',
              default: false
            },
            bookmark_id: {
              type: 'string',
              format: 'uuid'
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
          after,
          per_page: perPage,
          sensitive,
          bookmark_id: bookmarkId
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
          const afterCalcQuery = afterToBeforeArchivesQuery({
            perPage,
            ownerId: userId,
            bookmarkId,
            after,
            sensitive
          })

          const afterToBeforeResults = await fastify.pg.query(afterCalcQuery)

          const {
            archive_count: archiveCount,
            last_created_at: lastCreatedAt
          } = afterToBeforeResults.rows.pop()

          if (archiveCount !== perPageAfterOffset) {
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

        const archivesQuery = getArchivesQuery({
          ownerId: userId,
          bookmarkId,
          before,
          sensitive,
          perPage,
          fullArchives: request.query.full_archives
        })

        const archiveResults = await fastify.pg.query(archivesQuery)

        if (archiveResults.rows.length !== perPage) bottom = true

        const nextPage = bottom ? null : archiveResults.rows.at(-1).created_at
        const prevPage = top ? null : archiveResults.rows[0]?.created_at || before

        return {
          data: archiveResults.rows,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom
          }
        }
      })
    }
  )
}
