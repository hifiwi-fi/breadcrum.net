import S from 'fluent-json-schema'
import SQL from '@nearform/sql'

const logoutInfoSchema = S.object()
  .prop('logged_out', S.boolean())

export default async function logoutRoute (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        response: {
          200: logoutInfoSchema
        }
      }
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
          DELETE FROM auth_tokens
          WHERE jti = ${validJWT.jti} AND owner_id = ${validJWT.id};
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
          logged_out: true
        }
      } else {
        return {
          logged_out: false
        }
      }
    }
  )
}
