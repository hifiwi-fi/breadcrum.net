/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { oneLineTrim } from 'common-tags'

import { commnonBookmarkProps } from './bookmark-props.js'
import { resolveEntities } from './resolve-entities.js'
import { createEpisodeProp } from '../episodes/episode-props.js'
import { createEpisode } from '../episodes/episode-query-create.js'
import { createArchive } from '../archives/archive-query-create.js'
import { createArchiveProp } from '../archives/archive-props.js'
import { getBookmarksQuery } from './get-bookmarks-query.js'
import { fullBookmarkPropsWithEpisodes } from './mixed-bookmark-props.js'
import { putTagsQuery } from '../tags/put-tags-query.js'

// TODO: make this normalization way more robust and use it everywhere.
async function normalizeURL (urlObj) {
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
            description: oneLineTrim`
              If set to true, bookmarks that already exist at URL are redirected
              to to the specific bookmark endpoint which will process the
              request as a bookmark update. Otherwise, this creates or returns
              the existing bookmark.
            `
          },
          meta: {
            type: 'boolean',
            default: false,
            description: 'Extract page metadata on the server.'
          },
          episode: {
            type: 'boolean',
            default: true,
            description: 'Determines if an episode is optimistically created'
          },
          archive: {
            type: 'boolean',
            default: true,
            description: 'Determines if an archive is optimistically created'
          },
          normalize: {
            type: 'boolean',
            default: true,
            description: 'Normalize URLs when looking them up or creating them.'
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
          note,
          toread,
          sensitive,
          tags = [],
          archive_urls = [],
          summary
        } = request.body
        let { url, title } = request.body
        const urlObj = new URL(url)

        const {
          update,
          meta,
          episode,
          archive,
          normalize
        } = request.query

        if (normalize) { // This will be the one possibly slow step
          const { normalizedURL } = await normalizeURL(urlObj)
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

        // Title will fallback to just being the URL on create
        title = title ?? url

        const createBookmark = SQL`
        insert into bookmarks (
          url,
          title,
          note,
          toread,
          sensitive,
          archive_urls,
          summary,
          owner_id,
          done
        ) values (
          ${url},
          ${title ?? url ?? null},
          ${note ?? null},
          ${toread ?? false},
          ${sensitive ?? false},
          ${archive_urls.length > 0 ? archive_urls : SQL`'{}'`},
          ${summary ?? null},
          ${userId},
          ${meta === false}
        )
        returning id, url, title, toread, sensitive, archive_urls, owner_id;`

        const results = await client.query(createBookmark)
        const bookmark = results.rows[0]

        if (tags?.length > 0) {
          await putTagsQuery({
            fastify,
            pg: client,
            userId,
            bookmarkId: bookmark.id,
            tags
          })
        }

        let episodeId, episodeMedium, episodeURL
        if (episode) {
          // TODO: ensure handling of createEpisode url is correct
          const episodeEntity = await createEpisode({
            client,
            userId,
            bookmarkId: bookmark.id,
            type: request?.body?.createEpisode?.type ?? 'redirect',
            medium: request?.body?.createEpisode?.medium ?? 'video',
            url: request?.body?.createEpisode?.url ?? url
          })
          episodeId = episodeEntity.id
          episodeMedium = episodeEntity.medium
          episodeURL = episodeEntity.url
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
            extractionMethod: 'server'
          })

          archiveId = archiveEntity.id
          archiveURL = archiveEntity.url
        }

        // Commit bookmark, tags, archive and episode in their incomplete state
        await client.query('commit')
        fastify.metrics.episodeCounter.inc()
        fastify.metrics.archiveCounter.inc()
        fastify.metrics.bookmarkCreatedCounter.inc()

        if (archive || episode || meta) {
          fastify.pqueue.add(() => {
          // Resolve bookmark, episode and archives on every bookmark (with conditions)
            return resolveEntities({
              fastify,
              userId,
              log: request.log,
              resolveMeta: meta,
              episode,
              archive,
              url,
              title,
              tags,
              summary,
              bookmarkId: bookmark.id,
              archiveId,
              archiveURL,
              episodeId,
              episodeURL,
              episodeMedium
            })
          })
        }

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
