import SQL from '@nearform/sql'

import {
  tokenWithUserProps,
  validatedUserProps
} from '../user/user-props.js'

export default async function loginRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['user', 'password'],
          properties: {
            user: {
              anyOf: [
                validatedUserProps.username,
                validatedUserProps.email
              ]
            },
            password: { ...validatedUserProps.password }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps
            }
          }
        }
      }
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

        const token = await reply.createJWTToken(user)
        reply.setJWTCookie(token)

        reply.statusCode = 201
        return { user, token }
      } else {
        return fastify.httpErrors.unauthorized()
      }
    }
  )
}
