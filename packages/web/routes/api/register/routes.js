import {
  tokenWithUserProps,
  userEditableUserProps,
} from '../user/schemas/user-base.js'
import { registerUser } from './registration-action.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function registerRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: [
            'username',
            'email',
            'password',
            'newsletter_subscription',
          ],
          properties: {
            ...userEditableUserProps.properties,
            turnstile_token: {
              type: 'string',
              maxLength: 2048,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps.properties,
            },
          },
          403: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error message when registration is closed',
              },
            },
          },
        },
      },
    },
    async function (request, reply) {
      const result = await registerUser(fastify, request, reply, request.body)

      if (!result.ok) {
        if (result.statusCode === 403) {
          reply.code(403)
          return {
            error: result.message,
          }
        }

        if (result.statusCode === 409) return reply.conflict(result.message)
        return reply.unprocessableEntity(result.message)
      }

      reply.code(201)
      return {
        token: result.token,
        user: result.user,
      }
    }
  )
}
