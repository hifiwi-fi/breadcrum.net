import SQL from '@nearform/sql'

export default async function logoutRoute (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['logged_out'],
            properties: {
              logged_out: { type: 'boolean' },
            },
          },
        },
      },
    },
    async function (request, reply) {
      let validJWT
      try {
        validJWT = await request.jwtVerify()
      } catch (err) {
        request.log.warn('Invalid JWT received')
      }

      if (validJWT) {
        try {
          const query = SQL`
          delete from auth_tokens
          where jti = ${validJWT.jti} and owner_id = ${validJWT.id};
          `

          await fastify.pg.query(query)
          request.log.info(`Deleted ${validJWT.jti} for ${validJWT.username}`)
        } catch (err) {
          request.log.error(new Error('Error deleting JWT from db', { cause: err }))
        }
      }

      reply.deleteJWTCookie() // clear the cookie

      if (validJWT) {
        return {
          logged_out: true,
        }
      } else {
        return {
          logged_out: false,
        }
      }
    }
  )
}
