import { resendAccountEmailVerificationHandler } from './resend-account-confirmation.js'
import { resendPendingEmailVerificationHandler } from './resend-pending-confirmation.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * Request a email verification email
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function resendEmailVerification (fastify, opts) {
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
          properties: {
            update: {
              type: 'boolean',
            },
          },
        },
      },
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
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
