import { getArchives } from './archive-query-get.js'
import { addMillisecond } from '../bookmarks/addMillisecond.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaArchiveRead } from './schemas/schema-archive-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *  SerializerSchemaOptions: {
 *   references: [ SchemaArchiveRead ],
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *  }
 * }>}
 */
export async function getArchivesRoute (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['archives'],
        querystring: {
          type: 'object',
          properties: {
            before: {
              type: 'string',
              format: 'date-time',
            },
            after: {
              type: 'string',
              format: 'date-time',
            },
            per_page: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
            },
            sensitive: {
              type: 'boolean',
              default: false,
            },
            starred: {
              type: 'boolean',
              default: false,
            },
            toread: {
              type: 'boolean',
              default: false,
            },
            full_archives: {
              type: 'boolean',
              default: false,
            },
            bookmark_id: {
              type: 'string',
              format: 'uuid',
            },
            ready: {
              type: 'boolean',
            },
          },
          dependencies: {
            before: { allOf: [{ not: { required: ['after', 'url'] } }] },
            after: { allOf: [{ not: { required: ['before', 'url'] } }] },
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
                  $ref: 'schema:breadcrum:archive:read',
                },
              },
              pagination: {
                type: 'object',
                properties: {
                  before: { type: ['string'], nullable: true, format: 'date-time' },
                  after: { type: ['string'], nullable: true, format: 'date-time' },
                  top: { type: 'boolean' },
                  bottom: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async function getArchivesHandler (request, _reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id

        const {
          before,
          after,
          per_page: perPage,
          sensitive,
          toread,
          starred,
          ready,
          bookmark_id: bookmarkId,
        } = request.query

        const archives = await getArchives({
          fastify,
          pg: client,
          ownerId: userId,
          bookmarkId,
          before,
          after,
          sensitive,
          toread,
          starred,
          ready,
          perPage: perPage + 1,
          fullArchives: request.query.full_archives,
        })

        const top = Boolean(
          (!before && !after) ||
          (after && archives.length <= perPage)
        )
        const bottom = Boolean(
          (before && archives.length <= perPage) ||
          (!before && !after && archives.length <= perPage)
        )

        if (archives.length > perPage) {
          if (after) {
            archives.shift()
          } else {
            archives.pop()
          }
        }

        const nextPage = bottom ? null : archives.at(-1)?.created_at ?? null
        const prevPage = top ? null : addMillisecond(archives[0]?.created_at)

        const response = {
          data: archives,
          pagination: {
            before: nextPage,
            after: prevPage,
            top,
            bottom,
          },
        }
        return response
      })
    }
  )
}
