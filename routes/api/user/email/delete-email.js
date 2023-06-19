/* eslint-disable camelcase */
import SQL from '@nearform/sql'

// Delete any pendig email updates
export async function deleteEmail (fastify, opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT])
    },
    async function deleteEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const updates = [
          SQL`pending_email_update = null`,
          SQL`pending_email_update_token = null`,
          SQL`pending_email_update_token_exp = null`
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userId}
          returning username, email, pending_email_update, pending_email_update_token, pending_email_update_token_exp;
        `

        await client.query(updateQuery)

        reply.code(204)
      })
    }
  )
}
