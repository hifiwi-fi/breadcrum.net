/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { userEditableUserProps } from '../user-props.js'

// Unsubscribe an email address no matter what
export async function unsubscribeEmail (fastify, opts) {
  fastify.post(
    '::unsubscribe',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            email: userEditableUserProps.email
          },
          required: ['email']
        }
      },
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string'
            }
          }
        }
      }
    },
    async function unsubscribeEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const { email } = request.query

        const query = SQL`
        update users
        set newsletter_subscription = false
        where email = ${email}
        `

        await client.query(query)

        // TODO: log rows unsubscribing

        return {
          status: 'ok'
        }
      })
    }
  )
}
