import { getSearchArchivesQuery } from './get-search-archives-query.js'
/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function getSearchArchives (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['search', 'archives'],
        querystring: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            rank: {
              type: 'string',
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
            properties: {
              data: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: 'schema:breadcrum:archive:read' },
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
                properties: {
                  top: {
                    type: 'boolean',
                  },
                  bottom: {
                    type: 'boolean',
                  },
                  next: {
                    type: 'object',
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
    // Get Bookmarks
    async function getSearchArchivesHandler (request, reply) {
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

      const archivesQuery = getSearchArchivesQuery({
        query,
        ownerId: userId,
        sensitive,
        starred,
        toread,
        perPage: perPage + 1,
        lastRank: rank,
        lastId: id,
        reverse,
      })

      const results = await fastify.pg.query(archivesQuery)

      const top = !rank || (!rank && !id) || (reverse && results.rows.length <= perPage)
      const bottom = !reverse && results.rows.length <= perPage

      if (!reverse && !bottom) {
        results.rows.pop()
      }

      if (reverse && !top) {
        results.rows.shift()
      }

      const pagination = {
        top,
        bottom,
      }

      if (!top) {
        const firstResult = results.rows.at(0)
        if (firstResult) {
          pagination.prev = {
            rank: firstResult.rank,
            id: firstResult.id,
            reverse: true,
            query,
          }
        }
      }

      if (!bottom) {
        const lastResult = results.rows.at(-1)
        if (lastResult) {
          pagination.next = {
            rank: lastResult.rank,
            id: lastResult.id,
            reverse: false,
            query,
          }
        }
      }

      return {
        data: results.rows,
        pagination,
      }
    }
  )
}
