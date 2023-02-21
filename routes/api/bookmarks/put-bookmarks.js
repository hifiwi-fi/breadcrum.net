/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { commnonBookmarkProps } from './bookmark-props.js'
import { createEpisodeProp } from '../episodes/episode-props.js'
import { createEpisode } from '../episodes/episode-query-create.js'
import { resolveEpisode } from '../episodes/resolve-episode.js'
import { getBookmarksQuery } from './get-bookmarks-query.js'
import { fullBookmarkPropsWithEpisodes } from './mixed-bookmark-props.js'

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
        query: {
          update: {
            type: 'boolean',
            default: false,
            description: 'If set to true, bookmarks that already exist at URL are redirected to to the specific bookmark endpoint which will process the request as a bookmark update. Otherwise, this creates or returns the existing bookmark.'
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
                type: 'object',
                properties: {
                  ...fullBookmarkPropsWithEpisodes
                }
              }
            }
          },
          200: {
            type: 'object',
            description: 'Existing bookmarks are returned unmodified',
            properties: {
              status: { enum: ['nochange'] },
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
    async function createBookmark (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const {
          url,
          title,
          note,
          toread,
          sensitive,
          tags = [],
          archive_urls = []
        } = request.body

        const {
          update
        } = request.query

        const checkForExistingQuery = getBookmarksQuery({
          ownerId: userId,
          url,
          sensitive: true,
          perPage: 1
        })

        const existingResults = await client.query(checkForExistingQuery)
        const maybeResult = existingResults.rows[0]

        if (existingResults.rows.length > 0) {
          if (update) {
            reply.redirect(308, `/api/bookmarks/${maybeResult.id}`)
            return
          } else {
            reply.status(200)
            return {
              status: 'nochange',
              site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${maybeResult.id}`,
              data: maybeResult
            }
          }
        }

        const createBookmark = SQL`
        insert into bookmarks (
          url,
          title,
          note,
          toread,
          sensitive,
          archive_urls,
          owner_id
        ) values (
          ${url},
          ${title ?? null},
          ${note ?? null},
          ${toread ?? false},
          ${sensitive ?? false},
          ${archive_urls.length > 0 ? archive_urls : SQL`'{}'`},
          ${userId}
        )
        returning id, url, title, toread, sensitive, archive_urls, owner_id;`

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

          fastify.metrics.tagAppliedCounter.inc(tagsResults.rows.length)
        }

        if (request?.body?.createEpisode) {
          const { id: episodeId, medium: episodeMedium, url: episodeURL } = await createEpisode({
            client,
            userId,
            bookmarkId: bookmark.id,
            type: request?.body?.createEpisode.type,
            medium: request?.body?.createEpisode.medium,
            url: request?.body?.createEpisode.url ?? url
          })

          await client.query('commit')
          fastify.metrics.episodeCounter.inc()

          fastify.pqueue.add(() => {
            return resolveEpisode({
              fastify,
              userID: userId,
              bookmarkTitle: title,
              episodeID: episodeId,
              url: episodeURL,
              medium: episodeMedium,
              log: request.log
            })
          })
        }
        await client.query('commit')
        fastify.metrics.bookmarkCreatedCounter.inc()

        // Look up the newly created bookmark instead of trying to re-assemble it here.
        const bookmarkQuery = getBookmarksQuery({
          ownerId: userId,
          url,
          sensitive: true,
          perPage: 1
        })

        const createdResults = await fastify.pg.query(bookmarkQuery)
        const createdBookmark = createdResults.rows.pop()

        reply.status(201)
        return {
          status: 'ok',
          site_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${bookmark.id}`,
          data: createdBookmark
        }
      })
    }
  )
}
