/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

import { logoutSession } from '../auth/session.js'

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function logoutRoute (fastify, _opts) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: {
            type: 'object',
            required: ['logged_out'],
            properties: {
              logged_out: { type: 'boolean' },
            },
          },
        },
      },
    },
    async function (request, reply) {
      const loggedOut = await logoutSession(fastify, request, reply)

      if (loggedOut) {
        return {
          logged_out: true,
        }
      } else {
        return {
          logged_out: false,
        }
      }
    }
  )
}
