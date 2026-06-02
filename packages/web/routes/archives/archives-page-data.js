/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeArchiveRead } from '../api/archives/schemas/schema-archive-read.js'
 */

import { addMillisecond } from '../api/bookmarks/addMillisecond.js'
import { getArchives } from '../api/archives/archive-query-get.js'

/**
 * @typedef {object} ArchiveFilters
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {number} perPage
 * @property {boolean} sensitive
 * @property {boolean} starred
 * @property {boolean} toread
 * @property {string} bookmarkId
 * @property {boolean | null} ready
 * @property {string} queryString
 */

/**
 * @typedef {object} ArchivePagination
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 * @property {boolean} bottom
 */

/**
 * @typedef {object} ArchivesPageData
 * @property {TypeArchiveRead[]} archives
 * @property {ArchivePagination} pagination
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {ArchiveFilters} params.filters
 * @returns {Promise<ArchivesPageData>}
 */
export async function getArchivesPageData (fastify, { userId, filters }) {
  const rows = await getArchives({
    fastify,
    ownerId: userId,
    bookmarkId: filters.bookmarkId || undefined,
    before: filters.before ? filters.before.toISOString() : undefined,
    after: filters.after ? filters.after.toISOString() : undefined,
    sensitive: filters.sensitive,
    toread: filters.toread,
    starred: filters.starred,
    ready: filters.ready ?? undefined,
    perPage: filters.perPage + 1,
    fullArchives: false,
  })

  const top = Boolean(
    (!filters.before && !filters.after) ||
    (filters.after && rows.length <= filters.perPage)
  )
  const bottom = Boolean(
    (filters.before && rows.length <= filters.perPage) ||
    (!filters.before && !filters.after && rows.length <= filters.perPage)
  )

  if (rows.length > filters.perPage) {
    if (filters.after) {
      rows.shift()
    } else {
      rows.pop()
    }
  }

  return {
    archives: rows,
    pagination: {
      before: bottom ? null : rows.at(-1)?.created_at ?? null,
      after: top ? null : addMillisecond(rows[0]?.created_at),
      top,
      bottom,
    },
  }
}
