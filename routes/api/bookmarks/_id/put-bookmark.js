/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { createEpisode } from '../../episodes/episode-query-create.js'
import { commnonBookmarkProps } from '../bookmark-props.js'
import { createEpisodeProp } from '../../episodes/episode-props.js'
import { resolveEpisode } from '../../episodes/resolve-episode.js'

export async function putBookmark (fastify, opts) {
  fastify.put('/', {
    preHandler: fastify.auth([fastify.verifyJWT]),
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
          ...createEpisodeProp
        },
        minProperties: 1,
        additionalProperties: false
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

      if (bookmark?.createEpisode) {
        const { id: episodeId, medium: episodeMedium } = await createEpisode({
          client,
          userId,
          bookmarkId,
          type: bookmark.createEpisode.type,
          medium: bookmark.createEpisode.medium
        })

        await client.query('commit')
        fastify.metrics.episodeCounter.inc()

        const url = existingBookmark.url ?? bookmark.url // TODO: source this separately

        fastify.pqueue.add(() => {
          return resolveEpisode({
            userID: userId,
            episodeID: episodeId,
            url,
            medium: episodeMedium,
            log: request.log
          })
        })
      }

      fastify.metrics.bookmarkEditCounter.inc()

      return {
        status: 'ok'
      }
    })
  })
}
