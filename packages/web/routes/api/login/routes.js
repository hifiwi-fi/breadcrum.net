import {
  tokenWithUserProps,
  userEditableUserProps,
} from '../user/schemas/user-base.js'
import { loginWithPassword } from '../auth/session.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
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
                userEditableUserProps.properties.username,
                userEditableUserProps.properties.email,
              ],
            },
            password: userEditableUserProps.properties.password,
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps.properties,
            },
          },
        },
      },
    },
    async function loginRouteHandler (request, reply) {
      // TODO: fail if logged in

      const session = await loginWithPassword(fastify, reply, request.body)
      if (!session) return fastify.httpErrors.unauthorized()

      reply.statusCode = 201
      return session
    }
  )
}
