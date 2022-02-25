import SQL from '@nearform/sql'

export default async function loginRoutes (fastify, opts) {
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        properties: {
          user: { type: 'string' },
          password: { type: 'string' }
        },
        required: ['user', 'password']
      },
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
  }, async function (request, reply) {
    const user = request.body.user
    const password = request.body.password

    const isEmail = user.includes('@')

    const query = isEmail
      ? SQL`
      SELECT id, email, username, email_confirmed
      FROM users
      WHERE email = ${user}
      AND password = crypt(${password}, password);
      `
      : SQL`
      SELECT id, email, username, email_confirmed
      FROM users
      WHERE username = ${user}
      AND password = crypt(${password}, password);
    `

    const results = await fastify.pg.query(query)

    const foundUser = results.length > 0

    if (foundUser) {
      const user = results.pop()
      request.session.set('userId', user.id)
      return user
    } else {
      return fastify.httpErrors.unauthorized()
    }
  })
}
