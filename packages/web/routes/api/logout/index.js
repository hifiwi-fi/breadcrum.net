import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function logoutRoute (fastify, _opts) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['auth'],
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
