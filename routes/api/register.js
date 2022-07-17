import SQL from '@nearform/sql'
import S from 'fluent-json-schema'

const newUserJsonSchema = S.object()
  .prop('username',
    S.string()
      .minLength(1)
      .maxLength(50)
      .pattern('^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$')
  ).required()
  .prop('email',
    S.string()
      .format('email')
      .pattern("^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$") // eslint-disable-line no-useless-escape
  ).required()
  .prop('password',
    S.string()
      .minLength(8)
      .maxLength(50)
  ).required()

const createdUserJsonSchema = S.object()
  .prop('token', S.string())
  .prop('user', S.object()
    .prop('id', S.string().format('uuid'))
    .prop('email', S.string().format('email'))
    .prop('email_confirmed', S.boolean())
    .prop('username', S.string())
  )

export default async function registerRoutes (fastify, opts) {
  fastify.post(
    '/register',
    {
      schema: {
        body: newUserJsonSchema,
        response: {
          201: createdUserJsonSchema
        }
      }
    },
    async function (request, reply) {
      if (!fastify.config.REGISTRATION) {
        reply.code(403)
        return {
          error: 'Registration is closed. Please try again later.'
        }
      }
      const { username, email, password } = request.body

      // TODO: ensure not a duplicate user

      const query = SQL`
      INSERT INTO users (username, email, password) VALUES (
        ${username},
        ${email},
        crypt(${password}, gen_salt('bf'))
      )
      RETURNING id, email, username, email_confirmed;
      `

      const results = await fastify.pg.query(query)
      const user = results.rows[0]

      const token = await reply.createJWTToken(user)
      reply.setJWTCookie(token)

      reply.code(201)
      // TODO: ensure this user matches login/user object
      return {
        token,
        user
      }
    }
  )
}
