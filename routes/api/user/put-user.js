import SQL from '@nearform/sql'

export async function putUser (fastify, opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            username: {
              type: 'string',
              minLength: 1,
              maxLength: 100
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 50
            }
          }
        }
      }
    },
    async function putUserHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userID = request.user.id
        const user = request.body

        const updates = []

        if (user.username) updates.push(SQL`username = ${user.username}`)
        if (user.password) updates.push(SQL`password = crypt(${user.password}, gen_salt('bf'))`)

        if (updates.length > 0) {
          const query = SQL`
            update users
            set ${SQL.glue(updates, ' , ')}
            where id = ${userID}
          `
          await client.query(query)
        }

        return {
          status: 'ok'
        }
      })
    }
  )
}
