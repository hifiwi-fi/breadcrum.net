import SQL from '@nearform/sql'

export default async function userRoutes (fastify, opts) {
  fastify.get('/user', {
    preHandler: fastify.auth([fastify.verifySession]),
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            email_confirmed: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const id = request.session.get('userId')

    const query = SQL`
    SELECT id, email, username, email_confirmed
      FROM users
      WHERE id = ${id}
    `

    return fastify.pg.query(query)
  })
}
