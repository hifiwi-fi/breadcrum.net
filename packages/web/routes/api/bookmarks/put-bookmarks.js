/**
 * @import { SchemaBookmarkCreate } from './schemas/schema-bookmark-create.js'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 */
import { oneLineTrim } from 'common-tags'
import { createBookmarkFromInput } from './bookmark-create-action.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     references: [ SchemaBookmarkRead ],
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function putBookmarks (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: ({
        tags: ['bookmarks'],
        body: /** @type {SchemaBookmarkCreate} */ (fastify.getSchema('schema:breadcrum:bookmark:create')),
        querystring: {
          type: 'object',
          properties: {
            update: {
              type: 'boolean',
              default: false,
              description: oneLineTrim`
              If set to true, bookmarks that already exist at URL are redirected
              to to the specific bookmark endpoint which will process the
              request as a bookmark update. Otherwise, this creates or returns
              the existing bookmark.
            `,
            },
            meta: {
              type: 'boolean',
              default: true,
              description: 'Extract page metadata on the server. User provided fields take precedence.',
            },
            episode: {
              type: 'boolean',
              default: true,
              description: 'Determines if an episode is optimistically created',
            },
            archive: {
              type: 'boolean',
              default: true,
              description: 'Determines if an archive is optimistically created',
            },
            normalize: {
              type: 'boolean',
              default: true,
              description: 'Normalize URLs when looking them up or creating them.',
            },
            exact_url: {
              type: 'boolean',
              default: false,
              description: 'Skip normalization and use the submitted URL as-is.',
            },
          }
        },
        response: {
          201: {
            type: 'object',
            description: 'Newly created bookmarks are returned in full',
            properties: {
              status: { enum: ['created'] },
              site_url: { type: 'string' },
              data: {
                $ref: 'schema:breadcrum:bookmark:read',
              },
            },
          },
          200: {
            type: 'object',
            description: 'Existing bookmarks are returned unmodified',
            properties: {
              status: { enum: ['nochange'] },
              site_url: { type: 'string' },
              data: {
                $ref: 'schema:breadcrum:bookmark:read',
              },
            },
          },
        },
      }),
    },
    async function createBookmarkHandler (request, reply) {
      const result = await createBookmarkFromInput(fastify, {
        userId: request.user.id,
        input: request.body,
        options: {
          update: request.query.update,
          meta: request.query.meta,
          episode: request.query.episode,
          archive: request.query.archive,
          normalize: request.query.normalize,
          exactUrl: request.query.exact_url,
        },
      })

      if (!result.ok) {
        return result.statusCode === 400
          ? reply.badRequest(result.message)
          : reply.unprocessableEntity(result.message)
      }

      if (result.status === 'redirect') {
        return reply.redirect(result.redirectUrl, 308)
      }

      reply.status(result.statusCode)
      return /** @type {const} */ ({
        status: result.status,
        site_url: result.siteUrl,
        data: result.bookmark,
      })
    }
  )
}
