/* eslint-disable camelcase */
/**
 * @import { SchemaBookmarkCreate } from './schemas/schema-bookmark-create.js'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 */
import { oneLineTrim } from 'common-tags'
import { getBookmark } from './get-bookmarks-query.js'
import { createBookmark } from './put-bookmark-query.js'

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
              default: false,
              description: 'Extract page metadata on the server.',
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
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const {
          note,
          toread,
          sensitive,
          tags = [],
          archive_urls = [],
          summary,
        } = request.body
        let { url, title } = request.body
        const urlObj = new URL(url)

        const {
          update,
          meta,
          episode,
          archive,
          normalize,
        } = request.query

        const maybeResult = await getBookmark({
          fastify,
          pg: client,
          ownerId: userId,
          url,
          sensitive: true,
          perPage: 1,
        })

        if (maybeResult) {
          if (update) {
            reply.redirect(`/api/bookmarks/${maybeResult.id}`, 308)
            return
          } else {
            reply.status(200)
            return {
              status: 'nochange',
              site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${maybeResult.id}`,
              data: maybeResult,
            }
          }
        }

        // Title will fallback to just being the URL on create
        title = title ?? url

        const bookmark = await createBookmark({
          fastify,
          pg: client,
          url,
          title,
          note,
          toread,
          sensitive,
          archiveUrls: archive_urls,
          summary,
          userId,
          meta,
          tags
        })

        if (meta || episode || archive || normalize) {
          await fastify.queues.initializeBookmarkQ.add(
            'initialize-bookmark',
            {
              userId,
              bookmarkId: bookmark.id,
              resolveBookmark: meta,
              resolveEpisode: episode,
              resolveArchive: archive,
              normalizeURL: normalize,
              userProvidedMeta: {
                title,
                tags,
                summary,
              }
            }
          )
        }

        // Commit bookmark, tags, archive and episode in their incomplete state
        await client.query('commit')
        fastify.prom.bookmarkCreatedCounter.inc()

        // Look up the newly created bookmark instead of trying to re-assemble it here.
        const createdBookmark = await getBookmark({
          fastify,
          ownerId: userId,
          url,
          sensitive: true,
          perPage: 1,
        })

        reply.status(201)
        return {
          status: 'ok',
          site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${bookmark.id}`,
          data: createdBookmark,
        }
      })
    }
  )
}
