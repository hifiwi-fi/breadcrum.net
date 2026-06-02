import SQL from '@nearform/sql'
import { getBookmark } from './get-bookmarks-query.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeBookmarkRead } from './schemas/schema-bookmark-read.js'
 */

/**
 * @typedef {'toread' | 'starred' | 'sensitive'} BookmarkToggleField
 */

/**
 * @typedef {{ ok: true, bookmark: TypeBookmarkRead }} BookmarkToggleSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 404 | 422, message: string }} BookmarkToggleFailure
 */

/**
 * @typedef {BookmarkToggleSuccess | BookmarkToggleFailure} BookmarkToggleResult
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @param {BookmarkToggleField} params.field
 * @returns {Promise<BookmarkToggleResult>}
 */
export async function toggleBookmarkField (fastify, { userId, bookmarkId, field }) {
  const update = toggleUpdate(field)
  if (!update) return bookmarkToggleFailure(422, 'Invalid bookmark toggle field')

  const updateQuery = SQL`
    update bookmarks
    set ${update}
    where id = ${bookmarkId}
      and owner_id = ${userId}
    returning id;
  `

  const updateResult = await fastify.pg.query(updateQuery)
  if (updateResult.rows.length === 0) {
    return bookmarkToggleFailure(404, `bookmark ${bookmarkId} not found for user ${userId}`)
  }

  const bookmark = await getBookmark({
    fastify,
    ownerId: userId,
    bookmarkId,
    sensitive: true,
    perPage: 1,
  })

  if (!bookmark) {
    return bookmarkToggleFailure(404, `bookmark ${bookmarkId} not found for user ${userId}`)
  }

  fastify.otel.bookmarkEditCounter.add(1)

  return {
    ok: true,
    bookmark,
  }
}

/**
 * @param {BookmarkToggleField} field
 * @returns {import('@nearform/sql').SqlStatement | null}
 */
function toggleUpdate (field) {
  if (field === 'toread') return SQL`toread = not toread`
  if (field === 'starred') return SQL`starred = not starred`
  if (field === 'sensitive') return SQL`sensitive = not sensitive`
  return null
}

/**
 * @param {404 | 422} statusCode
 * @param {string} message
 * @returns {BookmarkToggleFailure}
 */
function bookmarkToggleFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
