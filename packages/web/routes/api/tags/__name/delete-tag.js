import SQL from '@nearform/sql'

export async function deleteTag (fastify, opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
    async function deleteTagHandler (request, reply) {
      const userId = request.user.id
      const tagName = request.params.name

      const query = SQL`
        delete from tags
        where name = ${tagName}
          AND owner_id =${userId};
      `

      await fastify.pg.query(query)

      reply.status = 202
      return {
        status: 'ok',
      }
    }
  )
}
