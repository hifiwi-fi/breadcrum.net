import { verifyEmailConfirmHandler } from './verify-email-confirm-handler.js'
import { verifyEmailUpdateHandler } from './verify-email-update-handler.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * Verify an email address or a pending email address
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function verifyEmailRoute (fastify, _opts) {
  fastify.post(
    '::verify',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['user'],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            token: {
              type: 'string',
              minLength: 64,
              maxLength: 64,
            },
            update: {
              type: 'boolean',
            },
          },
          required: ['token', 'update'],
        },
        response: {
          202: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string',
              },
              email: {
                type: 'string',
                format: 'email',
              },
              updated: {
                type: 'boolean',
              },
              confirmed: {
                type: 'boolean',
              },
            },
          },
        },
      },
    },
    async function verifyEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const now = new Date()
        const userId = request.user.id
        const { token, update } = request.body

        if (update) {
          return await verifyEmailUpdateHandler({
            userId,
            client,
            reply,
            token,
            now,
          })
        } else {
          return await verifyEmailConfirmHandler({
            userId,
            client,
            token,
            reply,
            now,
          })
        }
      })
    }
  )
}
