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
  .prop('id', S.string().format('uuid'))
  .prop('email', S.string().format('email'))
  .prop('username', S.string())

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
    async (request, reply) => {
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
    }
  )
}
