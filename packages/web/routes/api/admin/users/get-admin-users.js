import { fullSerializedAdminUserProps } from './admin-user-props.js'
import { userEditableUserProps } from '../../user/schemas/user-base.js'
import { getAdminUsersQuery } from './get-admin-users-query.js'
import { addMillisecond } from '../../bookmarks/addMillisecond.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *    }
 * }>}
 */
export async function getAdminUsers (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time',
            },
            after: {
              type: 'string',
              format: 'date-time',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 20,
            },
            username: userEditableUserProps.properties.username,
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after'] } }] },
            after: { allOf: [{ not: { required: ['before'] } }] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: fullSerializedAdminUserProps,
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: 'string', format: 'date-time' },
                  after: { type: 'string', format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    // GET users with administrative fields
    async function getAdminUsersHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const {
          before,
          after,
          per_page: perPage,
          username,
        } = request.query

        const adminUsersQuery = getAdminUsersQuery({
          before,
          after,
          perPage: perPage + 1,
          username,
        })

        const results = await client.query(adminUsersQuery)

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

        return {
          data: results.rows,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom,
          },
        }
      })
    }
  )
}
