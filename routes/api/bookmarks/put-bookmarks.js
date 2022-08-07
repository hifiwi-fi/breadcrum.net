/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import {
  commnonBookmarkProps,
  createEpisodeProp
} from './bookmark-props.js'
import { createEpisode } from '../../../lib/create-episode.js'
import { runYTDLP } from '../../../lib/run-yt-dlp.js'

export async function putBookmarks (fastify, opts) {
  // Create bookmark
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            ...commnonBookmarkProps,
            ...createEpisodeProp
          },
          additionalProperties: false,
          required: ['url']
        },
        response: {
          201: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              site_url: { type: 'string' }
            }
          }
        }
      }
    },
    async function createBookmark (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const {
          url,
          title,
          note,
          toread,
          sensitive,
          tags = []
        } = request.body

        const checkForExistingQuery = SQL`
        SELECT id, url
        FROM bookmarks
        WHERE owner_id = ${userId}
          AND url = ${url};
        `

        const existingResults = await client.query(checkForExistingQuery)
        const maybeResult = existingResults.rows[0]

        if (existingResults.rows.length > 0) {
          reply.redirect(301, `/api/bookmarks/${maybeResult.id}`)
          return {
            status: 'bookmark exists'
          }
        }

        const createBookmark = SQL`
        INSERT INTO bookmarks (url, title, note, toread, sensitive, owner_id) VALUES (
          ${url},
          ${title},
          ${note},
          ${toread || false},
          ${sensitive || false},
          ${userId}
        )
        RETURNING id, url, title, toread, sensitive, owner_id;`

        const results = await client.query(createBookmark)
        const bookmark = results.rows[0]

        if (tags.length > 0) {
          const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                tags.map(tag => SQL`(${tag},${userId})`),
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
              tagsResults.rows.map(tag => SQL`(${bookmark.id},${tag.id})`),
              ' , '
            )};
          `

          await client.query(applyTags)
        }

        if (request?.body?.createEpisode) {
          const { id: episodeId } = await createEpisode({
            client,
            userId,
            bookmarkId: bookmark.id,
            type: request?.body?.createEpisode.type,
            medium: request?.body?.createEpisode.medium
          })

          await client.query('commit')

          fastify.pqueue.add(runYTDLP({
            userId,
            bookmarkId: bookmark.id,
            episodeId,
            pg: fastify.pg,
            log: request.log
          })).catch(request.log.error)
        }

        return {
          status: 'ok',
          site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${bookmark.id}`
        }
      })
    }
  )
}
