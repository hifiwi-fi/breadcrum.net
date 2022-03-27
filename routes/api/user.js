import SQL from '@nearform/sql'
import S from 'fluent-json-schema'

const userJsonSchema = S.object()
  .prop('id', S.string().format('uuid'))
  .prop('email', S.string().format('email'))
  .prop('username', S.string())
  .prop('email_confirmed', S.boolean())

export default async function userRoutes (fastify, opts) {
  fastify.get(
    '/user',
    {
      preHandler: fastify.auth([fastify.verifySession]),
      schema: {
        response: {
          200: userJsonSchema
        }
      }
    },
    async (request, reply) => {
      const id = request.session.get('userId')

      const query = SQL`
      SELECT id, email, username, email_confirmed
        FROM users
        WHERE id = ${id}
      `

      const results = await fastify.pg.query(query)
      const user = results.rows.pop()

      if (user) return user
      else {
        reply.statusCode = 404
      }
    }
  )
}
