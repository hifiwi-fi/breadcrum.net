import SQL from '@nearform/sql'
import { createEpisode } from '../../episodes/episode-query-create.js'
import { createArchive } from '../../archives/archive-query-create.js'
import { getBookmark } from '../get-bookmarks-query.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { SchemaBookmarkCreate } from '../schemas/schema-bookmark-create.js'
 * @import { SchemaBookmarkRead } from '../schemas/schema-bookmark-read.js'
 * @import { SchemaEpisodeRead } from '../../episodes/schemas/schema-episode-read.js'
 * @import { SchemaArchiveRead } from '../../archives/schemas/schema-archive-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 * ValidatorSchemaOptions: {
 * references: [
 *       SchemaBookmarkCreate,
 *       SchemaBookmarkRead,
 *       SchemaEpisodeRead,
 *       SchemaArchiveRead
 *  ]
 }
 * SerializerSchemaOptions: {
 *    references: [
 *       SchemaBookmarkCreate,
 *       SchemaBookmarkRead,
 *       SchemaEpisodeRead,
 *       SchemaArchiveRead
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
    return fastify.pg.transact(async client => {
      const userId = request.user.id
      const bookmarkId = request.params.id
      const bookmark = request.body

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

      const updates = []

      if (bookmark.url != null) updates.push(SQL`url = ${bookmark.url}`)
      if (bookmark.title != null) updates.push(SQL`title = ${bookmark.title}`)
      if (bookmark.note != null) updates.push(SQL`note = ${bookmark.note}`)
      if (bookmark.summary != null) updates.push(SQL`summary = ${bookmark.summary}`)
      if (bookmark.starred != null) updates.push(SQL`starred = ${bookmark.starred}`)
      if (bookmark.toread != null) updates.push(SQL`toread = ${bookmark.toread}`)
      if (bookmark.sensitive != null) updates.push(SQL`sensitive = ${bookmark.sensitive}`)
      if (bookmark.archive_urls != null) updates.push(SQL`archive_urls = ${bookmark.archive_urls}`)

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
          fastify.prom.tagAppliedCounter.inc(tagsResults.rows.length)

          const removeOldTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
            AND tag_id NOT IN (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

          const removeResults = await client.query(removeOldTags)
          fastify.prom.tagRemovedCounter.inc(removeResults.rows.length)
        } else {
          const removeAllTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
        `

          await client.query(removeAllTags)
        }
      }

      await client.query('commit')
      fastify.prom.bookmarkEditCounter.inc()

      // Look up the newly created bookmark instead of trying to re-assemble it here.
      const createdBookmark = await getBookmark({
        fastify,
        pg: fastify.pg,
        ownerId: userId,
        bookmarkId,
        sensitive: true,
        perPage: 1,
      })

      if (bookmark?.createEpisode) {
        const { id: episodeId, medium: episodeMedium, url: episodeURL } = await createEpisode({
          client,
          userId,
          bookmarkId,
          type: bookmark.createEpisode.type,
          medium: bookmark.createEpisode.medium,
          url: request?.body?.createEpisode.url ?? bookmark.url ?? existingBookmark.url,
        })

        await client.query('commit')
        fastify.prom.episodeCounter.inc()

        await fastify.queues.resolveEpisodeQ.add(
          'resolve-episode',
          {
            userId,
            bookmarkTitle: createdBookmark.title,
            episodeId,
            url: episodeURL,
            medium: episodeMedium,
          }
        )
      }

      if (request?.body?.createArchive) {
        const { id: archiveId, url: archiveURL } = await createArchive({
          client,
          userId,
          bookmarkId: createdBookmark.id,
          bookmarkTitle: createdBookmark.title,
          url: request?.body?.createArchive?.url ?? bookmark.url ?? createdBookmark.url,
          extractionMethod: 'server',
        })

        await client.query('commit')
        fastify.prom.archiveCounter.inc()

        await fastify.queues.resolveDocumentQ.add(
          'resolve-document',
          {
            url: archiveURL,
            userId,
            archive: true,
            archiveId,
            archiveURL,
          }
        )
      }

      reply.status(200)

      return {
        status: 'updated',
        site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${createdBookmark.id}`,
        data: createdBookmark,
      }
    })
  })
}
