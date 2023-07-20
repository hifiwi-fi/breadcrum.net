import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password/password-hash.js'
import {
  validatedUserProps
} from '../user/user-props.js'

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
            username: { ...validatedUserProps.username },
            password: { ...validatedUserProps.password },
            newsletter_subscription: { ...validatedUserProps.newsletter_subscription }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' }
            }
          }
        }
      }
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

        return {
          status: 'ok'
        }
      })
    }
  )
}
