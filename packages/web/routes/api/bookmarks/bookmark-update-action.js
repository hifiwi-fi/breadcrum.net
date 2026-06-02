/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { normalizeURL } from '@breadcrum/resources/bookmarks/normalize-url.js'
import { isYouTubeUrl } from '@bret/is-youtube-url'
import { createEpisode } from '@breadcrum/resources/episodes/episode-query-create.js'
import { youtubeRetryOptions } from '@breadcrum/resources/episodes/resolve-episode-queue.js'
import { createArchive } from '@breadcrum/resources/archives/archive-query-create.js'
import { getBookmark } from './get-bookmarks-query.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkRead } from './schemas/schema-bookmark-read.js'
 * @import { TypeBookmarkUpdate } from './schemas/schema-bookmark-update.js'
 */

/**
 * @typedef {object} BookmarkUpdateOptions
 * @property {boolean} normalize
 * @property {boolean} exactUrl
 */

/**
 * @typedef {object} BookmarkUpdateSuccess
 * @property {true} ok
 * @property {'updated'} status
 * @property {200} statusCode
 * @property {string} siteUrl
 * @property {TypeBookmarkRead} bookmark
 */

/**
 * @typedef {object} BookmarkUpdateFailure
 * @property {false} ok
 * @property {400 | 404 | 422} statusCode
 * @property {string} message
 */

/**
 * @typedef {BookmarkUpdateSuccess | BookmarkUpdateFailure} BookmarkUpdateResult
 */

/**
 * Updates a bookmark and preserves the existing API side effects for tags,
 * archive URL updates, and optional episode/archive creation.
 *
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @param {TypeBookmarkUpdate} params.input
 * @param {BookmarkUpdateOptions} params.options
 * @returns {Promise<BookmarkUpdateResult>}
 */
export async function updateBookmarkFromInput (fastify, { userId, bookmarkId, input, options }) {
  return fastify.pg.transact(async client => {
    const shouldNormalize = options.exactUrl ? false : options.normalize
    const bookmark = { ...input }

    const bookmarkQuery = SQL`
      select url from bookmarks
      where id = ${bookmarkId}
        and owner_id = ${userId};
    `
    const bookmarkResults = await client.query(bookmarkQuery)
    /** @type {{ url: string } | undefined} */
    const existingBookmark = bookmarkResults.rows[0]
    if (!existingBookmark) {
      return bookmarkUpdateFailure(404, `bookmark ${bookmarkId} not found for user ${userId}`)
    }

    /** @type {SQL.SqlStatement[]} */
    const updates = []

    if (bookmark.url != null) {
      if (shouldNormalize) {
        try {
          const submittedUrlString = bookmark.url
          const submittedUrl = new URL(submittedUrlString)
          const normalizedUrl = await normalizeURL(submittedUrl, { cache: fastify.cache })
          const normalizedUrlString = normalizedUrl.toString()
          const originalUrl = normalizedUrlString === submittedUrlString ? null : submittedUrlString
          bookmark.url = normalizedUrlString
          updates.push(SQL`url = ${bookmark.url}`)
          updates.push(SQL`original_url = ${originalUrl}`)
        } catch {
          return bookmarkUpdateFailure(400, 'Invalid URL format')
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
              const normalized = await normalizeURL(new URL(archiveUrl), { cache: fastify.cache })
              return normalized.toString()
            })
          )
          bookmark.archive_urls = normalizedArchiveUrls
        } catch {
          return bookmarkUpdateFailure(400, 'Invalid archive URL format')
        }
      }
      updates.push(SQL`archive_urls = ${bookmark.archive_urls}`)
    }

    if (shouldNormalize && bookmark.createEpisode?.url) {
      try {
        const normalizedEpisodeUrl = await normalizeURL(new URL(bookmark.createEpisode.url), { cache: fastify.cache })
        bookmark.createEpisode.url = normalizedEpisodeUrl.toString()
      } catch {
        return bookmarkUpdateFailure(400, 'Invalid episode URL format')
      }
    }

    if (shouldNormalize && bookmark.createArchive && typeof bookmark.createArchive === 'object' && bookmark.createArchive.url) {
      try {
        const normalizedArchiveUrl = await normalizeURL(new URL(bookmark.createArchive.url), { cache: fastify.cache })
        bookmark.createArchive.url = normalizedArchiveUrl.toString()
      } catch {
        return bookmarkUpdateFailure(400, 'Invalid archive URL format')
      }
    }

    if (bookmark.title != null) updates.push(SQL`title = ${bookmark.title}`)
    if (bookmark.note != null) updates.push(SQL`note = ${bookmark.note}`)
    if (bookmark.summary != null) updates.push(SQL`summary = ${bookmark.summary}`)
    if (bookmark.starred != null) updates.push(SQL`starred = ${bookmark.starred}`)
    if (bookmark.toread != null) updates.push(SQL`toread = ${bookmark.toread}`)
    if (bookmark.sensitive != null) updates.push(SQL`sensitive = ${bookmark.sensitive}`)

    if (updates.length > 0) {
      const query = SQL`
        update bookmarks
        set ${SQL.glue(updates, ' , ')}
        where id = ${bookmarkId}
          and owner_id = ${userId};
      `

      await client.query(query)
    }

    if (Array.isArray(bookmark.tags)) {
      if (bookmark.tags.length > 0) {
        const createTags = SQL`
          insert into tags (name, owner_id)
          values
            ${SQL.glue(
              bookmark.tags.map(tag => SQL`(${tag}, ${userId})`),
              ' , '
            )}
          on conflict (name, owner_id)
          do update
            set name = excluded.name
          returning id, name, created_at, updated_at;
        `

        const tagsResults = await client.query(createTags)

        const applyTags = SQL`
          insert into bookmarks_tags (bookmark_id, tag_id)
          values
            ${SQL.glue(
              tagsResults.rows.map(tag => SQL`(${bookmarkId}, ${tag.id})`),
              ' , '
            )}
          on conflict (bookmark_id, tag_id)
          do nothing;
        `

        await client.query(applyTags)
        fastify.otel.tagAppliedCounter.add(tagsResults.rows.length)

        const removeOldTags = SQL`
          delete from bookmarks_tags
          where bookmark_id = ${bookmarkId}
            and tag_id not in (${SQL.glue(tagsResults.rows.map(tag => SQL`${tag.id}`), ', ')})
        `

        const removeResults = await client.query(removeOldTags)
        fastify.otel.tagRemovedCounter.add(removeResults.rows.length)
      } else {
        const removeAllTags = SQL`
          delete from bookmarks_tags
          where bookmark_id = ${bookmarkId}
        `

        await client.query(removeAllTags)
      }
    }

    await client.query('commit')
    fastify.otel.bookmarkEditCounter.add(1)

    const updatedBookmark = await getBookmark({
      fastify,
      pg: fastify.pg,
      ownerId: userId,
      bookmarkId,
      sensitive: true,
      perPage: 1,
    })

    if (!updatedBookmark) {
      return bookmarkUpdateFailure(422, 'Something went wrong retrieving the newly updated bookmark')
    }

    if (bookmark.createEpisode) {
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
        },
      })
    }

    return {
      ok: true,
      status: 'updated',
      statusCode: 200,
      siteUrl: siteUrl(fastify, updatedBookmark.id),
      bookmark: updatedBookmark,
    }
  })
}

/**
 * @param {FastifyInstance} fastify
 * @param {string} bookmarkId
 * @returns {string}
 */
function siteUrl (fastify, bookmarkId) {
  return `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/b?id=${bookmarkId}`
}

/**
 * @param {400 | 404 | 422} statusCode
 * @param {string} message
 * @returns {BookmarkUpdateFailure}
 */
function bookmarkUpdateFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
