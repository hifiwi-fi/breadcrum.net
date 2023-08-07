import { userProps } from '../../../../user/user-props.js'
import { adminUserProps } from '../amin-user-props.js'

export async function getAdminUser (fastify, opts) {
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
        response: {
          200: {
            type: 'object',
            properties: {
              ...userProps,
              ...adminUserProps
            }
          }
        }
      }
    },
    // GET user with administrative fields
    async function getAdminUserHandler (request, reply) {
      const adminFlags = await fastify.getFlags({ frontend: true, backend: true })
      return adminFlags
    }
  )
}
