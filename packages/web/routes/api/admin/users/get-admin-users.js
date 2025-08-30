import { userEditableUserProps } from '../../user/schemas/user-base.js'
import { getAdminUsers } from './get-admin-users-query.js'
import { addMillisecond } from '../../bookmarks/addMillisecond.js'
import { schemaAdminUsersRead } from './schemas/schema-admin-user-read.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *    }
 * }>}
 */
export async function getAdminUsersRoute (fastify, _opts) {
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
          200: schemaAdminUsersRead
        },
      },
    },
    // GET users with administrative fields
    async function getAdminUsersHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      return fastify.pg.transact(async client => {
        const {
          before,
          after,
          per_page: perPage,
          username,
        } = request.query

        const results = await getAdminUsers({
          fastify,
          pg: client,
          before,
          after,
          perPage: perPage + 1,
          username,
        })

        const top = Boolean(
          (!before && !after) ||
          (after && results.length <= perPage)
        )
        const bottom = Boolean(
          (before && results.length <= perPage) ||
          (!before && !after && results.length <= perPage)
        )

        if (results.length > perPage) {
          if (after) {
            results.shift()
          } else {
            results.pop()
          }
        }

        const nextPage = bottom ? null : results.at(-1)?.created_at ?? null
        const prevPage = top ? null : addMillisecond(results[0]?.created_at) ?? null

        /** @type {ReturnBody} */
        const returnData = {
          data: results,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom,
          },
        }

        return reply.code(200).send(returnData)
      })
    }
  )
}
