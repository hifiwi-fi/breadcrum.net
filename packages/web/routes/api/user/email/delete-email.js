import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * Delete any pending email updates
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function deleteEmail (fastify, _opts) {
  fastify.delete(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
      },
    },
    async function deleteEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const updates = [
          SQL`pending_email_update = null`,
          SQL`pending_email_update_token = null`,
          SQL`pending_email_update_token_exp = null`,
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
