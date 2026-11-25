import SQL from '@nearform/sql'
import { normalizeURL } from '#resources/bookmarks/normalize-url.js'
import { bookmarkScalarAssignments } from '#resources/bookmarks/bookmark-scalar-assignments.js'
import { isYouTubeUrl } from '@bret/is-youtube-url'
import { createEpisode } from '#resources/episodes/episode-query-create.js'
import { youtubeRetryOptions } from '#resources/episodes/resolve-episode-queue.js'
import { createArchive } from '#resources/archives/archive-query-create.js'
import { getBookmark } from '../get-bookmarks-query.js'
import { bookmarkSyncHeaders, bookmarkSyncReceipt, bookmarkSyncUpdate } from '../schemas/bookmark-sync.js'
import { withBookmarkReceipt } from '../sync-receipt.js'
import { syncEdit } from '../sync-edit.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkRead } from '../schemas/schema-bookmark-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
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
      description: 'Update a bookmark.',
      headers: bookmarkSyncHeaders,
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
      body: bookmarkSyncUpdate,
      response: {
        409: { $ref: 'HttpError' },
        200: {
          type: 'object',
          description: 'Returns the updated bookmark or a sync receipt.',
          properties: {
            sync: bookmarkSyncReceipt,
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
    const operationId = request.headers['idempotency-key']
    if (operationId) {
      reply.header('Cache-Control', 'private, no-store')
      const bookmarkId = request.params.id.toLowerCase()
      const ownerId = request.user.id
      const sync = await fastify.pg.transact(client => withBookmarkReceipt(
        client, fastify.httpErrors, ownerId, operationId, ['edit', bookmarkId, request.body, request.query],
        id => syncEdit(client, fastify.httpErrors, ownerId, id, bookmarkId, request.body)
      ))
      return reply.code(200).send({ sync })
    }
    if (request.body.sync) return reply.badRequest('Sync edits require Idempotency-Key.')

    return fastify.pg.transact(async client => {
      const userId = request.user.id
      const bookmarkId = request.params.id
      const bookmark = request.body

      const { normalize, exact_url: exactUrl } = request.query
      const shouldNormalize = exactUrl ? false : normalize

      // Check if bookmark exists:
      const bookmarkQuery = SQL`
              select url from bookmarks
              WHERE id = ${bookmarkId}
              AND owner_id =${userId};
            `
      const bookmarkResults = await client.query(bookmarkQuery)
      /** @type {{ url: string } | undefined} */
      const existingBookmark = bookmarkResults.rows[0]
      if (!existingBookmark) {
        return reply.notFound(`bookmark ${bookmarkId} not found for user ${userId}`)
      }

      /** @type {SQL.SqlStatement[]} */
      const updates = []

      if (bookmark.url != null) {
        if (shouldNormalize) {
          try {
            const submittedUrlString = bookmark.url
            const submittedUrl = new URL(submittedUrlString)
            const normalizedUrl = await normalizeURL(submittedUrl, { cache: fastify.cache, logger: request.log })
            bookmark.url = normalizedUrl.toString()
            const originalUrl = normalizedUrl.toString() === submittedUrlString ? null : submittedUrlString
            updates.push(SQL`url = ${bookmark.url}`)
            updates.push(SQL`original_url = ${originalUrl}`)
          } catch (err) {
            return reply.badRequest('Invalid URL format')
          }
        } else {
          updates.push(SQL`url = ${bookmark.url}`)
          updates.push(SQL`original_url = ${null}`)
        }
      }

      if (bookmark.archive_urls != null) {
        if (shouldNormalize) {
          try {
            const normalizedArchiveUrls = await Promise.all(
              bookmark.archive_urls.map(async (archiveUrl) => {
                const normalized = await normalizeURL(new URL(archiveUrl), { cache: fastify.cache, logger: request.log })
                return normalized.toString()
              })
            )
            bookmark.archive_urls = normalizedArchiveUrls
          } catch (err) {
            return reply.badRequest('Invalid archive URL format')
          }
        }
        updates.push(SQL`archive_urls = ${bookmark.archive_urls}`)
      }

      if (shouldNormalize && bookmark.createEpisode?.url) {
        try {
          const normalizedEpisodeUrl = await normalizeURL(new URL(bookmark.createEpisode.url), { cache: fastify.cache, logger: request.log })
          bookmark.createEpisode.url = normalizedEpisodeUrl.toString()
        } catch (err) {
          return reply.badRequest('Invalid episode URL format')
        }
      }

      if (shouldNormalize && bookmark.createArchive && typeof bookmark.createArchive === 'object' && bookmark.createArchive.url) {
        try {
          const normalizedArchiveUrl = await normalizeURL(new URL(bookmark.createArchive.url), { cache: fastify.cache, logger: request.log })
          bookmark.createArchive.url = normalizedArchiveUrl.toString()
        } catch (err) {
          return reply.badRequest('Invalid archive URL format')
        }
      }

      updates.push(...bookmarkScalarAssignments(bookmark))

      if (updates.length > 0) {
        const query = SQL`
          UPDATE bookmarks
          SET ${SQL.glue(updates, ' , ')}
          WHERE id = ${bookmarkId}
            AND owner_id =${userId};
          `

        await client.query(query)
      }

      if (Array.isArray(bookmark.tags)) {
        if (updates.length === 0) {
          // Serialize tag-only replacements with native edits on this bookmark.
          const locked = await client.query(SQL`
            select id from bookmarks where id = ${bookmarkId} and owner_id = ${userId} for no key update
          `)
          if (locked.rowCount === 0) {
            return reply.notFound(`bookmark ${bookmarkId} not found for user ${userId}`)
          }
        }
        if (bookmark.tags.length > 0) {
          const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                bookmark.tags.map(tag => SQL`(${tag},${userId})`),
                ' , '
              )}
          ON CONFLICT (name, owner_id)
          DO UPDATE
            SET name = EXCLUDED.name
          returning id, name, created_at, updated_at;
          `

          const tagsResults = await client.query(createTags)

          const applyTags = SQL`
          INSERT INTO bookmarks_tags (bookmark_id, tag_id)
          VALUES
            ${SQL.glue(
              tagsResults.rows.map(tag => SQL`(${bookmarkId},${tag.id})`),
              ' , '
            )}
          ON CONFLICT (bookmark_id, tag_id)
          DO NOTHING;
          `

          await client.query(applyTags)
          fastify.otel.tagAppliedCounter.add(tagsResults.rows.length)

          const removeOldTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
            AND tag_id NOT IN (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

          const removeResults = await client.query(removeOldTags)
          fastify.otel.tagRemovedCounter.add(removeResults.rows.length)
        } else {
          const removeAllTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
        `

          await client.query(removeAllTags)
        }
      }

      await client.query('commit')
      fastify.otel.bookmarkEditCounter.add(1)

      // Look up the newly created bookmark instead of trying to re-assemble it here.
      const updatedBookmark = await getBookmark({
        fastify,
        pg: fastify.pg,
        ownerId: userId,
        bookmarkId,
        sensitive: true,
        perPage: 1,
      })

      if (!updatedBookmark) throw new Error('Something wen\'t wrong retreiving the newly updated bookmark')

      if (bookmark?.createEpisode) {
        const { id: episodeId, medium: episodeMedium, url: episodeURL } = await createEpisode({
          client,
          userId,
          bookmarkId,
          type: bookmark.createEpisode.type,
          medium: bookmark.createEpisode.medium,
          url: bookmark.createEpisode.url ?? updatedBookmark.url,
        })

        const isYouTube = isYouTubeUrl(new URL(episodeURL))
        const retryOptions = isYouTube ? youtubeRetryOptions : undefined

        await client.query('commit')
        fastify.otel.episodeCounter.add(1)

        const resolveEpisodeData = {
          userId,
          bookmarkTitle: updatedBookmark.title,
          episodeId,
          url: episodeURL,
          medium: episodeMedium,
          parentRequestId: request.id,
        }

        const resolveEpisodePayload = retryOptions
          ? { data: resolveEpisodeData, options: retryOptions }
          : { data: resolveEpisodeData }

        await fastify.pgboss.queues.resolveEpisodeQ.send(resolveEpisodePayload)
      }

      if (bookmark.createArchive) {
        const archiveUrl = (bookmark.createArchive === true)
          ? updatedBookmark.url
          : bookmark.createArchive?.url ?? updatedBookmark.url
        const { id: archiveId, url: archiveURL } = await createArchive({
          client,
          userId,
          bookmarkId: updatedBookmark.id,
          bookmarkTitle: updatedBookmark.title ?? updatedBookmark.url,
          url: archiveUrl,
          extractionMethod: 'server',
        })

        await client.query('commit')
        fastify.otel.archiveCounter.add(1)

        await fastify.pgboss.queues.resolveArchiveQ.send({
          data: {
            url: archiveURL,
            userId,
            archiveId,
            parentRequestId: request.id,
          }
        })
      }

      reply.status(200)

      return /** @type { const } */({
        status: 'updated',
        site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${updatedBookmark.id}`,
        data: updatedBookmark,
      })
    })
  })
}
