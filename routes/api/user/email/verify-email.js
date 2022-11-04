/* eslint-disable camelcase */
import { verifyEmailConfirmHandler } from './verify-email-confirm-handler.js'
import { verifyEmailUpdateHandler } from './verify-email-update-handler.js'

export async function verifyEmail (fastify, opts) {
  fastify.post(
    '::verify',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              minLength: 64,
              maxLength: 64
            },
            update: {
              type: 'boolean'
            }
          },
          required: ['token', 'update']
        }
      },
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            updated: {
              type: 'boolean'
            },
            confirmed: {
              type: 'boolean'
            }
          }
        }
      }
    },
    async function verifyEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const now = new Date()
        const userID = request.user.id
        const { token, update } = request.body

        if (update) {
          return await verifyEmailUpdateHandler({
            userID,
            client,
            reply,
            token,
            now
          })
        } else {
          return await verifyEmailConfirmHandler({
            userID,
            client,
            token,
            reply,
            now
          })
        }
      })
    }
  )
}
