import { userEditableUserProps } from '../../user/schemas/user-base.js'
import { listAdminUsersForAdmin } from './admin-user-actions.js'
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

        const result = await listAdminUsersForAdmin({
          fastify,
          pg: client,
          before,
          after,
          perPage,
          username,
        })

        /** @type {ReturnBody} */
        const returnData = {
          data: result.data,
          pagination: result.pagination,
        }

        return reply.code(200).send(returnData)
      })
    }
  )
}
