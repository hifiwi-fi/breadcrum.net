import SQL from '@nearform/sql'

/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {{ ok: true }} BookmarkDeleteSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 404, message: string }} BookmarkDeleteFailure
 */

/**
 * @typedef {BookmarkDeleteSuccess | BookmarkDeleteFailure} BookmarkDeleteResult
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @returns {Promise<BookmarkDeleteResult>}
 */
export async function deleteBookmarkById (fastify, { userId, bookmarkId }) {
  const query = SQL`
    delete from bookmarks
    where id = ${bookmarkId}
      and owner_id = ${userId}
    returning id;
  `

  const results = await fastify.pg.query(query)
  if (results.rows.length === 0) {
    return {
      ok: false,
      statusCode: 404,
      message: `bookmark ${bookmarkId} not found for user ${userId}`,
    }
  }

  fastify.otel.bookmarkDeleteCounter.add(1)

  return {
    ok: true,
  }
}
