import { userProps } from './user-props.js'
import { getUserQuery } from './user-query.js'

export async function getUser (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        response: {
          200: userProps
        }
      }
    },
    async function (request, reply) {
      const userId = request.user.id

      const query = getUserQuery({ userId })

      const results = await fastify.pg.query(query)
      const user = results.rows.pop()

      fastify.log.info({ user })

      if (user) {
        // TODO refresh token
        return user
      } else {
        return reply.notFound('User not found')
      }
    }
  )
}
