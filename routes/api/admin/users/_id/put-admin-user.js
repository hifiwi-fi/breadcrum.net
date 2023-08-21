// import SQL from '@nearform/sql'
// import { fullSerializedUserProps } from '../../../../user/user-props.js'
import { fullSerializedAdminUserProps } from '../admin-user-props.js'

export async function putAdminUser (fastify, opts) {
  fastify.put(
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
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            fullSerializedAdminUserProps
          }
        },
        response: {
          200: {

          }
        }
      }
    },
    // PUT user with administrative fields
    async function putAdminUserHandler (request, reply) {
      return fastify.pg.transact(async client => {
        throw new Error('NOT IMPLEMENTEd')
      })
    }
  )
}
