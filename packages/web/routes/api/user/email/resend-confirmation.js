import { resendAccountEmailVerificationHandler } from './resend-account-confirmation.js'
import { resendPendingEmailVerificationHandler } from './resend-pending-confirmation.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * Request a email verification email
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function resendEmailVerificationRoute (fastify, _opts) {
  fastify.post(
    '::resend',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['user'],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            update: {
              type: 'boolean',
            },
          },
        },
        response: {
          202: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string', enum: ['ok']
              },
            },
          },
        },
      },
    },
    async function resendEmailVerificationHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { update } = request.body

        if (update) {
          return await resendPendingEmailVerificationHandler({ userId, client, reply, fastify })
        } else {
          return await resendAccountEmailVerificationHandler({ userId, client, reply, fastify })
        }
      })
    }
  )
}
