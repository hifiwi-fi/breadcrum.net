import SQL from '@nearform/sql'

import {
  tokenWithUserProps,
  userEditableUserProps,
} from '../user/user-props.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function loginRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['user', 'password'],
          properties: {
            user: {
              anyOf: [
                userEditableUserProps.username,
                userEditableUserProps.email,
              ],
            },
            password: userEditableUserProps.password,
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps,
            },
          },
        },
      },
    },
    async function (request, reply) {
      // TODO: fail if logged in

      const user = request.body.user
      const password = request.body.password

      const isEmail = user.includes('@')

      const query = SQL`
      select
        id,
        email,
        username,
        email_confirmed,
        newsletter_subscription
      from users
      where ${isEmail ? SQL`email = ${user}` : SQL`username = ${user}`}
      and password = crypt(${password}, password)
      limit 1;
      `

      const { rows } = await fastify.pg.query(query)

      const foundUser = rows.length > 0

      if (foundUser) {
        const user = rows.pop()

        const token = await reply.createJWTToken({ id: user.id, username: user.username })
        reply.setJWTCookie(token)

        reply.statusCode = 201
        return { user, token }
      } else {
        return fastify.httpErrors.unauthorized()
      }
    }
  )
}
