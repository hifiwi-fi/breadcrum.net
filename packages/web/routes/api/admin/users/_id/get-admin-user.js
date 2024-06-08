import { fullSerializedAdminUserProps } from '../admin-user-props.js'
import { getAdminUsersQuery } from '../get-admin-users-query.js'

export async function getAdminUser (fastify, opts) {
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: fullSerializedAdminUserProps,
          },
        },
      },
    },
    // GET user with administrative fields
    async function getAdminUserHandler (request, reply) {
      const { id: userId } = request.params

      const query = getAdminUsersQuery({
        userId,
      })

      const results = await fastify.pg.query(query)
      const user = results.rows[0]

      if (!user) {
        return reply.notFound('user id not found')
      }

      return user
    }
  )
}
