import { userProps } from '../../../user/user-props.js'
import { adminUserProps } from './admin-user-props.js'

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
              }
            }
          }
        }
      }
    },
    // GET users with administrative fields
    async function getAdminUsersHandler (request, reply) {
      throw new Error('Not implemented')
    }
  )
}
