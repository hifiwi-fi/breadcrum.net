/* eslint-disable camelcase */
import SQL from '@nearform/sql'

// Unsubscribe an email address no matter what
export async function unsubscribeEmail (fastify, opts) {
  fastify.post(
    '::unsubscribe',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email'
            }
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
        const { email } = request.body

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
