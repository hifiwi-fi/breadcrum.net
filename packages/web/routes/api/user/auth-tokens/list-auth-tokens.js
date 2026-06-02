import { schemaAuthTokenRead } from './schemas/schema-auth-token-read.js'
import { listAuthTokensForUser } from './auth-token-actions.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function listAuthTokens (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['auth-tokens'],
        summary: 'List auth tokens for the current user',
        description: 'Get a paginated list of auth tokens (sessions) for the authenticated user',
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              pattern: '^\\d+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
              description: 'Cursor for pagination - composite cursor (microseconds:jti)',
            },
            after: {
              type: 'string',
              pattern: '^\\d+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
              description: 'Cursor for pagination - composite cursor (microseconds:jti)',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 5, // You only really need to see the last most of the time.
              description: 'Number of tokens to return per page',
            },
            sort: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Sort order by last_seen date',
            },
          },
          required: ['per_page', 'sort'],
          dependencies: {
            before: { allOf: [{ not: { required: ['after'] } }] },
            after: { allOf: [{ not: { required: ['before'] } }] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: schemaAuthTokenRead,
              },
              pagination: {
                type: 'object',
                properties: {
                  before: {
                    type: ['string'],
                    nullable: true,
                    pattern: '^\\d+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                    description: 'Cursor for fetching previous page (microseconds:jti)',
                  },
                  after: {
                    type: ['string'],
                    nullable: true,
                    pattern: '^\\d+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                    description: 'Cursor for fetching next page (microseconds:jti)',
                  },
                  top: {
                    type: 'boolean',
                    description: 'Whether this is the first page',
                  },
                  bottom: {
                    type: 'boolean',
                    description: 'Whether this is the last page',
                  },
                },
                required: ['top', 'bottom'],
              },
            },
            required: ['data', 'pagination'],
          },
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function listAuthTokensHandler (request, reply) {
      const userId = request.user.id
      const currentJti = request.user.jti
      const {
        before,
        after,
        per_page: perPage,
        sort: sortOrder,
      } = request.query

      return fastify.pg.transact(async client => {
        const result = await listAuthTokensForUser({
          fastify,
          pg: client,
          userId,
          currentJti,
          beforeCursor: before,
          afterCursor: after,
          perPage,
          sortOrder,
        })

        return reply.code(200).send({
          data: result.data,
          pagination: result.pagination,
        })
      })
    }
  )
}
