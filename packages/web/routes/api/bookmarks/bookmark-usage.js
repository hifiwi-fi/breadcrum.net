/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 */

import SQL from '@nearform/sql'
import { getMonthlyWindow } from '../billing/subscriptions.js'

/**
 * @typedef {object} BookmarkUsage
 * @property {number} count
 * @property {number} limit
 * @property {Date} window_start
 * @property {Date} window_end
 */

/**
 * @typedef {object} BookmarkUsageParams
 * @property {PgClient} pg
 * @property {string} userId
 * @property {number} limit
 * @property {Date} [now]
 */

/**
 * Returns the user's current month bookmark usage.
 * @param {BookmarkUsageParams} params
 * @returns {Promise<BookmarkUsage>}
 */
export async function getMonthlyBookmarkUsage ({ pg, userId, limit, now = new Date() }) {
  const { windowStart, windowEnd } = getMonthlyWindow(now)

  const query = SQL`
    select count(*)::int as count
    from bookmarks b
    where b.owner_id = ${userId}
      and b.created_at >= ${windowStart}
      and b.created_at < ${windowEnd}
  `

  /** @type {QueryResult<{ count: number }>} */
  const results = await pg.query(query)
  const count = results.rows[0]?.count ?? 0

  return {
    count,
    limit,
    window_start: windowStart,
    window_end: windowEnd,
  }
}
