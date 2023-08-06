/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { createEpisode } from '../../episodes/episode-query-create.js'
import { commnonBookmarkProps } from '../bookmark-props.js'
import { createEpisodeProp } from '../../episodes/episode-props.js'
import { createArchiveProp } from '../../archives/archive-props.js'
import { createArchive } from '../../archives/archive-query-create.js'
import { resolveArchive } from '../../archives/resolve-archive.js'
import { resolveEpisode } from '../../episodes/resolve-episode.js'
import { fullBookmarkPropsWithEpisodes } from '../mixed-bookmark-props.js'
import { getBookmarksQuery } from '../get-bookmarks-query.js'

export async function putBookmark (fastify, opts) {
  fastify.put('/', {
    preHandler: fastify.auth([
      fastify.verifyJWT,
      fastify.notDisabled
    ], {
      relation: 'and'
    }),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          ...commnonBookmarkProps,
          ...createEpisodeProp,
          ...createArchiveProp
        },
        minProperties: 1,
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          description: 'Existing bookmarks are returned unmodified',
          properties: {
            status: { enum: ['updated'] },
            site_url: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                ...fullBookmarkPropsWithEpisodes
              }
            }
          }
        }
      }
    }
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
          fastify.metrics.tagAppliedCounter.inc(tagsResults.rows.length)

          const removeOldTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
            AND tag_id NOT IN (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

          const removeResults = await client.query(removeOldTags)
          fastify.metrics.tagRemovedCounter.inc(removeResults.rows.length)
        } else {
          const removeAllTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
        `

          await client.query(removeAllTags)
        }
      }

      await client.query('commit')
      fastify.metrics.bookmarkEditCounter.inc()

      // Look up the newly created bookmark instead of trying to re-assemble it here.
      const updatedBookmarkQuery = getBookmarksQuery({
        ownerId: userId,
        bookmarkId,
        sensitive: true,
        perPage: 1
      })

      const createdResults = await fastify.pg.query(updatedBookmarkQuery)
      const createdBookmark = createdResults.rows.pop()

      if (bookmark?.createEpisode) {
        const { id: episodeId, medium: episodeMedium, url: episodeURL } = await createEpisode({
          client,
          userId,
          bookmarkId,
          type: bookmark.createEpisode.type,
          medium: bookmark.createEpisode.medium,
          url: request?.body?.createEpisode.url ?? bookmark.url ?? existingBookmark.url
        })

        await client.query('commit')
        fastify.metrics.episodeCounter.inc()

        fastify.pqueue.add(() => {
          return resolveEpisode({
            fastify,
            userId,
            episodeId,
            bookmarkTitle: createdBookmark.title,
            medium: episodeMedium,
            url: episodeURL,
            log: request.log
          })
        })
      }

      if (request?.body?.createArchive) {
        const { id: archiveId, url: archiveURL } = await createArchive({
          client,
          userId,
          bookmarkId: createdBookmark.id,
          bookmarkTitle: createdBookmark.title,
          url: request?.body?.createArchive?.url ?? bookmark.url ?? createdBookmark.url,
          extractionMethod: 'server'
        })

        await client.query('commit')
        fastify.metrics.archiveCounter.inc()

        fastify.pqueue.add(() => {
          return resolveArchive({
            fastify,
            userId,
            bookmarkTitle: createdBookmark.title,
            archiveId,
            url: archiveURL,
            log: request.log
          })
        })
      }

      reply.status(200)

      return {
        status: 'updated',
        site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${createdBookmark.id}`,
        data: createdBookmark
      }
    })
  })
}
