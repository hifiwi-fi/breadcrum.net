import { updateBookmarkFromInput } from '../bookmark-update-action.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkUpdate } from '../schemas/schema-bookmark-update.js'
 * @import { SchemaBookmarkRead } from '../schemas/schema-bookmark-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 * ValidatorSchemaOptions: {
 * references: [
 *       SchemaBookmarkUpdate
 *  ]
 }
 * SerializerSchemaOptions: {
 *    references: [
 *       SchemaBookmarkRead
 *     ],
 *    deserialize: [{
 *       pattern: {
 *         type: "string"
 *         format: "date-time"
 *       }
 *       output: Date
 *     }]
 }
* }>}
 */
export async function putBookmark (fastify, _opts) {
  fastify.put('/', {
    preHandler: fastify.auth([
      fastify.verifyJWT,
      fastify.notDisabled,
    ], {
      relation: 'and',
    }),
    schema: {
      tags: ['bookmarks'],
      querystring: {
        type: 'object',
        properties: {
          normalize: {
            type: 'boolean',
            default: true,
            description: 'Normalize URLs when updating them.',
          },
          exact_url: {
            type: 'boolean',
            default: false,
            description: 'Skip normalization and use the submitted URL as-is.',
          },
        },
      },
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        $ref: 'schema:breadcrum:bookmark:update',
        minProperties: 1,
      },
      response: {
        200: {
          type: 'object',
          description: 'Existing bookmarks are returned unmodified',
          properties: {
            status: { type: 'string', enum: ['updated'] },
            site_url: { type: 'string' },
            data: {
              $ref: 'schema:breadcrum:bookmark:read',
            },
          },
        },
      },
    },
  },
  async function putBookmarkHandler (request, reply) {
    const result = await updateBookmarkFromInput(fastify, {
      userId: request.user.id,
      bookmarkId: request.params.id,
      input: request.body,
      options: {
        normalize: request.query.normalize,
        exactUrl: request.query.exact_url,
      },
    })

    if (!result.ok) {
      if (result.statusCode === 400) return reply.badRequest(result.message)
      if (result.statusCode === 404) return reply.notFound(result.message)
      return reply.unprocessableEntity(result.message)
    }

    reply.status(200)
    return /** @type { const } */({
      status: 'updated',
      site_url: result.siteUrl,
      data: result.bookmark,
    })
  })
}
