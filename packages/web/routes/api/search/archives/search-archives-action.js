/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeArchiveRead } from '../../archives/schemas/schema-archive-read.js'
 */

import { getSearchArchivesQuery } from './get-search-archives-query.js'

/**
 * @typedef {TypeArchiveRead & { rank: number }} SearchArchiveResult
 */

/**
 * @typedef {object} SearchPageCursor
 * @property {string} rank
 * @property {string} id
 * @property {string} query
 * @property {boolean} reverse
 */

/**
 * @typedef {object} SearchPagination
 * @property {boolean} top
 * @property {boolean} bottom
 * @property {SearchPageCursor} [next]
 * @property {SearchPageCursor} [prev]
 */

/**
 * @typedef {object} ArchiveSearchParams
 * @property {string} userId
 * @property {string} query
 * @property {number} perPage
 * @property {boolean} sensitive
 * @property {boolean} starred
 * @property {boolean} toread
 * @property {string | undefined} [rank]
 * @property {string | undefined} [id]
 * @property {boolean | undefined} [reverse]
 */

/**
 * @typedef {object} ArchiveSearchResult
 * @property {SearchArchiveResult[]} data
 * @property {SearchPagination} pagination
 */

/**
 * @param {FastifyInstance} fastify
 * @param {ArchiveSearchParams} params
 * @returns {Promise<ArchiveSearchResult>}
 */
export async function searchArchives (fastify, params) {
  const archivesQuery = getSearchArchivesQuery({
    query: params.query,
    ownerId: params.userId,
    sensitive: params.sensitive,
    starred: params.starred,
    toread: params.toread,
    perPage: params.perPage + 1,
    lastRank: params.rank,
    lastId: params.id,
    reverse: params.reverse,
  })

  const results = await fastify.pg.query(archivesQuery)
  const reverse = params.reverse === true
  const top = !params.rank || (!params.rank && !params.id) || (reverse && results.rows.length <= params.perPage)
  const bottom = !reverse && results.rows.length <= params.perPage

  if (!reverse && !bottom) results.rows.pop()
  if (reverse && !top) results.rows.shift()

  /** @type {SearchPagination} */
  const pagination = {
    top,
    bottom,
  }

  if (!top) {
    const firstResult = results.rows.at(0)
    if (firstResult) {
      pagination.prev = {
        rank: String(firstResult.rank),
        id: firstResult.id,
        reverse: true,
        query: params.query,
      }
    }
  }

  if (!bottom) {
    const lastResult = results.rows.at(-1)
    if (lastResult) {
      pagination.next = {
        rank: String(lastResult.rank),
        id: lastResult.id,
        reverse: false,
        query: params.query,
      }
    }
  }

  return {
    data: /** @type {SearchArchiveResult[]} */ (results.rows),
    pagination,
  }
}
