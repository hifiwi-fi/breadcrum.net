import SQL from '@nearform/sql'
import { userProps } from '../../../../user/user-props.js'
import { adminUserProps } from '../amin-user-props.js'

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

      })
    }
  )
}
