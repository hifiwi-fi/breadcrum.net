import SQL from '@nearform/sql'

export default async function registerRoutes (fastify, opts) {
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        properties: {
          user: { type: 'string' },
          password: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['user', 'password', 'email']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username, email, password } = request.body

    const query = SQL`
      INSERT INTO users (username, email, password) VALUES (
        ${username},
        ${email},
        crypt(${password}, gen_salt('bf'))
      );
      `

    const { id } = await fastify.pg.query(query)

    request.session.set('userId', id)
    reply.code(201)
    return {
      id,
      email,
      username
    }
  })
}
