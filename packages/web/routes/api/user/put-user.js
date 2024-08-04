import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password/password-hash.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaUserUpdate } from './schemas/schema-user-update.js'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *       deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>}
 */
export async function putUserRoute (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        body: /** @type {SchemaUserUpdate} */(fastify.getSchema('schema:breadcrum:user:update')),
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['ok'] },
            },
          },
        },
      },
    },
    async function putUserHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const user = request.body

        const updates = []

        if ('username' in user) {
          const usernameQuery = SQL`
            select u.username
            from users u
            where u.username = ${user.username}
            fetch first 1 row only;
        `

          const usernameResults = await client.query(usernameQuery)

          if (usernameResults.rows.length > 0) {
            return reply.conflict('Username is already taken.')
          }
          updates.push(SQL`username = ${user.username}`)
        }
        if ('password' in user) updates.push(SQL`password = ${getPasswordHashQuery(user.password)}`)
        if ('newsletter_subscription' in user) updates.push(SQL`newsletter_subscription = ${user.newsletter_subscription}`)

        if (updates.length > 0) {
          const query = SQL`
            update users
            set ${SQL.glue(updates, ' , ')}
            where id = ${userId}
          `
          await client.query(query)
        }

        return /** @type {const} */ ({
          status: 'ok',
        })
      })
    }
  )
}
