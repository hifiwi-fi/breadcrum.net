/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { commnonBookmarkProps } from './bookmark-props.js'
import { createEpisodeProp } from '../episodes/episode-props.js'
import { createEpisode } from '../episodes/episode-query-create.js'
import { createArchive } from '../archives/archive-query-create.js'
import { createArchiveProp } from '../archives/archive-props.js'
import { resolveEpisode } from '../episodes/resolve-episode.js'
import { resolveArchive } from '../archives/resolve-archive.js'
import { getBookmarksQuery } from './get-bookmarks-query.js'
import { fullBookmarkPropsWithEpisodes } from './mixed-bookmark-props.js'

const autoEpisodeHostnames = {
  'www.youtube.com': 'video',
  'm.youtube.com': 'video',
  'vimeo.com': 'video'
}

function normalizeURL (urlObj) {
  if (urlObj.host === 'm.youtube.com') urlObj.host = 'www.youtube.com'
  return {
    normalizedURL: urlObj.toString()
  }
}

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
            ...createEpisodeProp,
            ...createArchiveProp
          },
          additionalProperties: false,
          required: ['url']
        },
        query: {
          update: {
            type: 'boolean',
            default: false,
            description: 'If set to true, bookmarks that already exist at URL are redirected to to the specific bookmark endpoint which will process the request as a bookmark update. Otherwise, this creates or returns the existing bookmark.'
          },
          meta: {
            type: 'boolean',
            default: false,
            description: 'Extract page metadata on the server.'
          },
          normalize: {
            type: 'boolean',
            default: true,
            description: 'Normalize URLs when looking them up or creating them.'
          },
          autoEpisodes: {
            type: 'boolean',
            default: true,
            description: 'Automatically create episodes on common episode sources.'
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
          title,
          note,
          toread,
          sensitive,
          tags = [],
          archive_urls = [],
          summary
        } = request.body
        let { url } = request.body
        const urlObj = new URL(url)

        const {
          update,
          meta,
          normalize,
          autoEpisodes
        } = request.query

        if (normalize) {
          const { normalizedURL } = normalizeURL(urlObj)
          url = normalizedURL
        }

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

        const serverMeta = meta ? await fastify.getSiteMetaData({ url }) : {}

        const createBookmark = SQL`
        insert into bookmarks (
          url,
          title,
          note,
          toread,
          sensitive,
          archive_urls,
          summary,
          owner_id
        ) values (
          ${url},
          ${title ?? serverMeta?.title ?? null},
          ${note ?? null},
          ${toread ?? false},
          ${sensitive ?? false},
          ${archive_urls.length > 0 ? archive_urls : SQL`'{}'`},
          ${summary ?? serverMeta?.summary ?? null},
          ${userId}
        )
        returning id, url, title, toread, sensitive, archive_urls, owner_id;`

        const results = await client.query(createBookmark)
        const bookmark = results.rows[0]

        if (tags?.length > 0 || serverMeta?.tags?.length > 0) {
          const activeTagSet = tags.length > 0 ? tags : serverMeta?.tags
          const createTags = SQL`
          INSERT INTO tags (name, owner_id)
          VALUES
             ${SQL.glue(
                activeTagSet.map(tag => SQL`(${tag},${userId})`),
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

        if (request?.body?.createEpisode || (autoEpisodes && autoEpisodeHostnames[urlObj.hostname])) {
          const { id: episodeId, medium: episodeMedium, url: episodeURL } = await createEpisode({
            client,
            userId,
            bookmarkId: bookmark.id,
            type: request?.body?.createEpisode?.type ?? 'redirect',
            medium: request?.body?.createEpisode?.medium ?? autoEpisodeHostnames[urlObj.hostname],
            url: request?.body?.createEpisode?.url ?? url
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

        const { id: archiveID, url: archiveURL } = await createArchive({
          client,
          userID: userId,
          bookmarkId: bookmark.id,
          bookmarkTitle: title ?? serverMeta?.title ?? null,
          url: request?.body?.createArchive?.url ?? url,
          extractionMethod: 'server'
        })

        await client.query('commit')
        fastify.metrics.archiveCounter.inc()

        fastify.pqueue.add(() => {
          return resolveArchive({
            fastify,
            userID: userId,
            bookmarkTitle: title ?? serverMeta?.title ?? null,
            archiveID,
            url: archiveURL,
            initialHTML: serverMeta?.html,
            log: request.log
          })
        })

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
