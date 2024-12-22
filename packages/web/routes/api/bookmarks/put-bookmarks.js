/* eslint-disable camelcase */
/**
 * @import { SchemaBookmarkCreate } from './schemas/schema-bookmark-create.js'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schemas/schema-bookmark-read.js'
 */
import { oneLineTrim } from 'common-tags'
import { createEpisode } from '../episodes/episode-query-create.js'
import { createArchive } from '../archives/archive-query-create.js'
import { getBookmark } from './get-bookmarks-query.js'
import { normalizeURL } from './normalizeURL.js'
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
        console.log('RUNNNING')
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

        if (normalize) { // This will be the one possibly slow step
          const { normalizedURL } = await normalizeURL(urlObj)
          url = normalizedURL
        }

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
            console.log({ update })
            reply.redirect(`/api/bookmarks/${maybeResult.id}`, 308)
            return
          } else {
            console.log({ update })
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

        let episodeId, episodeMedium, episodeURL
        if (episode) {
          // TODO: ensure handling of createEpisode url is correct
          const episodeEntity = await createEpisode({
            client,
            userId,
            bookmarkId: bookmark.id,
            type: request?.body?.createEpisode?.type ?? 'redirect',
            medium: request?.body?.createEpisode?.medium ?? 'video',
            url: request?.body?.createEpisode?.url ?? url,
          })
          episodeId = episodeEntity.id
          episodeMedium = episodeEntity.medium
          episodeURL = episodeEntity.url

          await fastify.queues.resolveEpisodeQ.add(
            'resolve-episode',
            {
              userId,
              bookmarkTitle: bookmark.title,
              episodeId,
              url: episodeURL,
              medium: episodeMedium,
            }
          )
        }

        let archiveId, archiveURL
        if (archive) {
          // TODO: ensure handling of createArchive url is correct
          const archiveEntity = await createArchive({
            client,
            userId,
            bookmarkId: bookmark.id,
            bookmarkTitle: title ?? null,
            url: request?.body?.createArchive?.url ?? url,
            extractionMethod: 'server',
          })

          archiveId = archiveEntity.id
          archiveURL = archiveEntity.url
        }

        // Commit bookmark, tags, archive and episode in their incomplete state
        await client.query('commit')
        fastify.prom.episodeCounter.inc()
        fastify.prom.archiveCounter.inc()
        fastify.prom.bookmarkCreatedCounter.inc()

        if (archive || meta) {
          await fastify.queues.resolveDocumentQ.add(
            'resolve-document',
            {
              url,
              userId,
              resolveMeta: meta,
              archive,
              title,
              tags,
              summary,
              bookmarkId: bookmark.id,
              archiveId,
              archiveURL,
            }
          )
        }

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
