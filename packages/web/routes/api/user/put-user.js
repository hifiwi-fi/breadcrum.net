import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password/password-hash.js'
import { getUser } from './user-query.js'
import { schemaUserUpdate } from './schemas/schema-user-update.js'
import { schemaUserRead } from './schemas/schema-user-read.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *    SerializerSchemaOptions: {
 *       deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }
 * }>}
 */
export async function putUserRoute (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        body: schemaUserUpdate,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: { type: 'string', enum: ['ok'] },
              data: schemaUserRead,
            },
          },
          404: { $ref: 'HttpError' },
          409: { $ref: 'HttpError' },
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
        if ('service_notice_dismissed_hash' in user) {
          updates.push(SQL`service_notice_dismissed_hash = ${user.service_notice_dismissed_hash}`)
        }

        if (updates.length > 0) {
          const query = SQL`
            update users
            set ${SQL.glue(updates, ' , ')}
            where id = ${userId}
          `
          await client.query(query)
        }

        const updatedUser = await getUser({ pg: client, fastify, userId })
        if (!updatedUser) return reply.notFound('User not found')
        return /** @type {const} */ ({ status: 'ok', data: updatedUser })
      })
    }
  )
}
