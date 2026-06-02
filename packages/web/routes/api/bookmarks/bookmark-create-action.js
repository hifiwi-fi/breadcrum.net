/* eslint-disable camelcase */
import { normalizeURL } from '@breadcrum/resources/bookmarks/normalize-url.js'
import { getBookmark } from './get-bookmarks-query.js'
import { createBookmark } from './put-bookmark-query.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkCreate } from './schemas/schema-bookmark-create.js'
 * @import { TypeBookmarkRead } from './schemas/schema-bookmark-read.js'
 */

/**
 * @typedef {object} BookmarkCreateOptions
 * @property {boolean} update
 * @property {boolean} meta
 * @property {boolean} episode
 * @property {boolean} archive
 * @property {boolean} normalize
 * @property {boolean} exactUrl
 */

/**
 * @typedef {object} BookmarkCreateSuccess
 * @property {true} ok
 * @property {'created' | 'nochange'} status
 * @property {200 | 201} statusCode
 * @property {string} siteUrl
 * @property {TypeBookmarkRead} bookmark
 */

/**
 * @typedef {object} BookmarkCreateRedirect
 * @property {true} ok
 * @property {'redirect'} status
 * @property {308} statusCode
 * @property {string} redirectUrl
 * @property {TypeBookmarkRead} bookmark
 */

/**
 * @typedef {object} BookmarkCreateFailure
 * @property {false} ok
 * @property {400 | 422} statusCode
 * @property {string} message
 */

/**
 * @typedef {BookmarkCreateSuccess | BookmarkCreateRedirect | BookmarkCreateFailure} BookmarkCreateResult
 */

/**
 * Creates a bookmark, or returns the existing bookmark for the normalized URL.
 *
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {TypeBookmarkCreate} params.input
 * @param {BookmarkCreateOptions} params.options
 * @returns {Promise<BookmarkCreateResult>}
 */
export async function createBookmarkFromInput (fastify, { userId, input, options }) {
  return fastify.pg.transact(async client => {
    const {
      note,
      toread,
      sensitive,
      tags = [],
      archive_urls = [],
      summary,
    } = input

    const submittedUrlString = input.url
    const submittedTitle = input.title

    let submittedUrl
    try {
      submittedUrl = new URL(submittedUrlString)
    } catch {
      return bookmarkCreateFailure(400, 'Invalid URL format')
    }

    const shouldNormalize = options.exactUrl ? false : options.normalize

    const workingUrl = shouldNormalize
      ? await normalizeURL(submittedUrl, { cache: fastify.cache })
      : submittedUrl
    const workingUrlString = shouldNormalize ? workingUrl.toString() : submittedUrlString

    const maybeResult = await getBookmark({
      fastify,
      pg: client,
      ownerId: userId,
      url: workingUrlString,
      sensitive: true,
      perPage: 1,
    })

    if (maybeResult) {
      if (options.update) {
        return {
          ok: true,
          status: 'redirect',
          statusCode: 308,
          redirectUrl: `/api/bookmarks/${maybeResult.id}`,
          bookmark: maybeResult,
        }
      }

      return {
        ok: true,
        status: 'nochange',
        statusCode: 200,
        siteUrl: siteUrl(fastify, maybeResult.id),
        bookmark: maybeResult,
      }
    }

    const workingTitle = submittedTitle || workingUrlString

    const bookmark = await createBookmark({
      fastify,
      pg: client,
      url: workingUrlString,
      title: workingTitle,
      note,
      toread,
      sensitive,
      archiveUrls: archive_urls,
      summary,
      userId,
      originalUrl: shouldNormalize && workingUrlString !== submittedUrlString ? submittedUrlString : null,
      meta: options.meta,
      tags,
    })

    await client.query('commit')
    fastify.otel.bookmarkCreatedCounter.add(1)

    if (options.meta || options.episode || options.archive) {
      await fastify.pgboss.queues.resolveBookmarkQ.send({
        data: {
          userId,
          url: workingUrlString,
          bookmarkId: bookmark.id,
          resolveBookmark: options.meta,
          resolveEpisode: options.episode,
          resolveArchive: options.archive,
          userProvidedMeta: {
            title: submittedTitle,
            tags,
            summary,
          },
        },
      })
    }

    const createdBookmark = await getBookmark({
      fastify,
      ownerId: userId,
      bookmarkId: bookmark.id,
      sensitive: true,
      perPage: 1,
    })

    if (!createdBookmark) {
      return bookmarkCreateFailure(422, 'Bookmark was not created')
    }

    return {
      ok: true,
      status: 'created',
      statusCode: 201,
      siteUrl: siteUrl(fastify, bookmark.id),
      bookmark: createdBookmark,
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
 * @param {400 | 422} statusCode
 * @param {string} message
 * @returns {BookmarkCreateFailure}
 */
function bookmarkCreateFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
