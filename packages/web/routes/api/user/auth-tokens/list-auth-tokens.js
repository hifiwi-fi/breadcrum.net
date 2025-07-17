import { schemaAuthTokenRead } from './schemas/schema-auth-token-read.js'
import { getAuthTokens } from './get-auth-tokens-query.js'

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
              default: 20,
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
                    type: ['string', 'null'],
                    pattern: '^\\d+:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                    description: 'Cursor for fetching previous page (microseconds:jti)',
                  },
                  after: {
                    type: ['string', 'null'],
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
    async function listAuthTokensHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const currentJti = request.user.jti
        const {
          before,
          after,
          per_page: perPage,
          sort: sortOrder,
        } = request.query

        const tokens = await getAuthTokens({
          fastify,
          pg: client,
          userId,
          currentJti,
          beforeCursor: before,
          afterCursor: after,
          perPage: perPage + 1,
          sortOrder,
        })

        const top = Boolean(
          (!before && !after) ||
          (after && tokens.length <= perPage)
        )
        const bottom = Boolean(
          (before && tokens.length <= perPage) ||
          (!before && !after && tokens.length <= perPage)
        )

        if (tokens.length > perPage) {
          if (after) {
            tokens.shift()
          } else {
            tokens.pop()
          }
        }

        // Calculate pagination cursors using microsecond precision
        let nextPage = null
        let prevPage = null

        if (!bottom && tokens.length > 0) {
          const lastToken = tokens.at(-1)
          nextPage = lastToken ? `${lastToken.last_seen_micros}:${lastToken.jti}` : null
        }

        if (!top && tokens.length > 0) {
          const firstToken = tokens[0]
          prevPage = firstToken ? `${firstToken.last_seen_micros}:${firstToken.jti}` : null
        }

        return reply.code(200).send({
          data: tokens,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom,
          },
        })
      })
    }
  )
}
