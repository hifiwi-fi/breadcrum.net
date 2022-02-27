import SQL from '@nearform/sql'
import S from 'fluent-json-schema'

const credentialsSchema = S.object()
  .prop('user',
    S.string()
      .minLength(1)
      .maxLength(100)
  ).required()
  .prop('password',
    S.string()
      .minLength(8)
      .maxLength(50)
  ).required()

const userInfoSchema = S.object()
  .prop('id', S.string().format('uuid'))
  .prop('email', S.string().format('email'))
  .prop('username', S.string())
  .prop('email_confirmed', S.boolean())

export default async function loginRoutes (fastify, opts) {
  fastify.post(
    '/login',
    {
      schema: {
        body: credentialsSchema,
        response: {
          201: userInfoSchema
        }
      }
    },
    async function (request, reply) {
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
    }
  )
}
