/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { createEpisode } from '../../../../lib/create-episode.js'
import { runYTDLP } from '../../../../lib/run-yt-dlp.js'
import { commnonBookmarkProps } from '../bookmark-props.js'
import {
  getBookmarkEditCounter,
  getTagAppliedCounter,
  getTagRemovedCounter
} from '../put-bookmarks.js'

const createEpisodeProp = {
  createEpisode: {
    anyOf: [
      {
        type: 'object',
        properties: {
          type: { enum: ['redirect'] },
          medium: { enum: ['video', 'audio'] }
        }
      },
      {
        type: 'null'
      }
    ]
  }
}

export async function putBookmark (fastify, opts) {
  const bookmarkEditCounter = new fastify.metrics.client.Counter({
    name: 'bredcrum_bookmark_edit_total',
    help: 'The number of times bookmarks are edited'
  })

  const episodeCounter = getBookmarkEditCounter(fastify)
  const tagAppliedCounter = getTagAppliedCounter(fastify)
  const tagRemovedCounter = getTagRemovedCounter(fastify)

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

      const updates = []

      if (bookmark.url != null) updates.push(SQL`url = ${bookmark.url}`)
      if (bookmark.title != null) updates.push(SQL`title = ${bookmark.title}`)
      if (bookmark.note != null) updates.push(SQL`note = ${bookmark.note}`)
      if (bookmark.starred != null) updates.push(SQL`starred = ${bookmark.starred}`)
      if (bookmark.toread != null) updates.push(SQL`toread = ${bookmark.toread}`)
      if (bookmark.sensitive != null) updates.push(SQL`sensitive = ${bookmark.sensitive}`)

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
          tagAppliedCounter.inc(tagsResults.rows.length)

          const removeOldTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
            AND tag_id NOT IN (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

          const removeResults = await client.query(removeOldTags)
          tagRemovedCounter.inc(removeResults.rows.length)
        } else {
          const removeAllTags = SQL`
          DELETE FROM bookmarks_tags
          WHERE bookmark_id = ${bookmarkId}
        `

          await client.query(removeAllTags)
        }
      }

      if (bookmark?.createEpisode) {
        const { id: episodeId } = await createEpisode({
          client,
          userId,
          bookmarkId,
          type: bookmark.createEpisode.type,
          medium: bookmark.createEpisode.medium
        })

        await client.query('commit')

        fastify.pqueue.add(runYTDLP({
          userId,
          bookmarkId,
          episodeId,
          pg: fastify.pg,
          log: request.log
        })).then(() => episodeCounter.inc()).catch(request.log.error)
      }

      bookmarkEditCounter.inc()

      return {
        status: 'ok'
      }
    })
  })
}
