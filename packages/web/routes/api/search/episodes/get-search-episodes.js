import { searchEpisodes } from './search-episodes-action.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getSearchEpisodes (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['search', 'episodes'],
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['query'],
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            rank: {
              type: 'number',
              description: 'The rank use for paginating',
            },
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The id use for paginating',
            },
            reverse: {
              type: 'boolean',
              default: 'false',
              description: 'Reverse direction of pagination. Use the first id and rank in the page when set to true. Use the last rank and id when paging in the forward direction.',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
              description: 'The number of search results per page',
            },
            sensitive: {
              type: 'boolean',
              default: false,
              description: 'Include sensitive bookmkarks in search results when true',
            },
            starred: {
              type: 'boolean',
              default: false,
              description: 'Only include starred bookmarks in search results when true',
            },
            toread: {
              type: 'boolean',
              default: false,
              description: 'Only include unread bookmarks in search results when true',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['data', 'pagination'],
            properties: {
              data: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: 'schema:breadcrum:episode:read' },
                    {
                      type: 'object',
                      properties: {
                        rank: {
                          type: 'number',
                        },
                      },
                    },
                  ],
                },
              },
              pagination: {
                type: 'object',
                additionalProperties: false,
                required: ['top', 'bottom'],
                properties: {
                  top: {
                    type: 'boolean',
                  },
                  bottom: {
                    type: 'boolean',
                  },
                  next: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['rank', 'id', 'query', 'reverse'],
                    properties: {
                      rank: {
                        type: 'string',
                      },
                      id: {
                        type: 'string',
                        format: 'uuid',
                      },
                      query: {
                        type: 'string',
                      },
                      reverse: {
                        type: 'boolean',
                      },
                    },
                  },
                  prev: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['rank', 'id', 'query', 'reverse'],
                    properties: {
                      rank: {
                        type: 'string',
                      },
                      id: {
                        type: 'string',
                        format: 'uuid',
                      },
                      query: {
                        type: 'string',
                      },
                      reverse: {
                        type: 'boolean',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async function getSearchEpisodesHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      /** @typedef {ReturnBody['pagination']} PaginationType */

      const userId = request.user.id
      const {
        rank,
        id,
        query,
        per_page: perPage,
        sensitive,
        starred,
        toread,
        reverse,
      } = request.query

      const results = await searchEpisodes(fastify, {
        userId,
        query,
        perPage,
        sensitive,
        starred,
        toread,
        rank,
        id,
        reverse,
      })

      /** @type {ReturnBody} */
      const response = {
        data: /** @type {any} */ (results.data),
        pagination: /** @type {PaginationType} */ (results.pagination),
      }
      return reply.code(200).send(response)
    }
  )
}
