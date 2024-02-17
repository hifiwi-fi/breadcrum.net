import SQL from '@nearform/sql'

export async function deleteAdminUser (fastify, opts) {
  fastify.delete(
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
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        }
      }
    },
    // DELETE user as an admin
    async function deleteAdminUserHandler (request, reply) {
      const userId = request.user.id
      const { id: targetUserId } = request.params

      if (userId === targetUserId) {
        return reply.conflict('You can\'t delete yourself this way')
      }

      const query = SQL`
        DELETE from users
        WHERE id = ${targetUserId};
      `

      await fastify.pg.query(query)

      return {
        status: 'ok'
      }
    }
  )
}
