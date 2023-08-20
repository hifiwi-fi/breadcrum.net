import { userProps } from '../../../user/user-props.js'
import { adminUserProps } from './admin-user-props.js'
import { getAdminUsersQuery, afterToBeforeAdminUsersQuery } from './get-admin-users-query.js'

export async function getAdminUsers (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin
      ], {
        relation: 'and'
      }),
      schema: {
        hide: true,
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
                    ...userProps,
                    ...adminUserProps
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
    // GET users with administrative fields
    async function getAdminUsersHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const {
          after,
          per_page: perPage
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
          const afterCalcQuery = afterToBeforeAdminUsersQuery({
            perPage,
            after
          })

          const results = await client.query(afterCalcQuery)

          const { user_count: userCount, last_created_at: lastCreatedAt } = results.rows.pop() ?? {}

          if (userCount !== perPageAfterOffset) {
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

        const adminUsersQuery = getAdminUsersQuery({
          before,
          perPage
        })

        const results = await client.query(adminUsersQuery)

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
      })
    }
  )
}
