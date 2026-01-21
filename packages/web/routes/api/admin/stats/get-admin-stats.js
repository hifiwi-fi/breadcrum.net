import SQL from '@nearform/sql'
import { readFile } from 'node:fs/promises'
import { schemaAdminStatsRead } from './schemas/schema-admin-stats-read.js'

const countsSqlUrl = new URL('./counts.sql', import.meta.url)
/** @type {string | null} */
let countsSqlText = null

async function getCountsSqlText () {
  if (!countsSqlText) {
    countsSqlText = await readFile(countsSqlUrl, 'utf8')
  }

  return countsSqlText
}

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 * @import { QueryResult } from 'pg'
 * @import { TypeAdminStatsReadClient } from './schemas/schema-admin-stats-read.js'
 */

/**
 * @typedef {Object} BookmarkStatRow
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} bookmark_count
 */

/**
 * @typedef {Object} TotalUsersRow
 * @property {string} users_count
 */

/**
 * @typedef {Object} TotalBookmarksRow
 * @property {string} bookmark_count
 */

/**
 * @typedef {Object} CumulativeCountRawRow
 * @property {string} label
 * @property {string | number} year
 * @property {string | number} cumulative_count
 */

/**
 * @typedef {Record<string, string>} YearCountMap
 */

/**
 * @typedef {TypeAdminStatsReadClient['cumulativeCounts'][number]} CumulativeCountRow
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function getAdminStats (fastify, _opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        response: {
          200: schemaAdminStatsRead,
        },
      },
    },
    // Get admin flags
    async function getAdminFlagsHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      const monthBookmarkCountQuery = SQL`
        select u.id, u.username, u.email, count(*) as bookmark_count
        from users u
        left join bookmarks b
        on u.id = b.owner_id
        where b.created_at >= NOW() - INTERVAL '1 month'
        group by u.id, u.username, u.email
        order by bookmark_count desc;
      `

      /** @type {QueryResult<BookmarkStatRow>} */
      const monthBookmarkCountResults = await fastify.pg.query(monthBookmarkCountQuery)

      const totalCountQuery = SQL`
        select count(*) as bookmark_count
        from bookmarks b;
      `

      /** @type {QueryResult<TotalBookmarksRow>} */
      const totalCountResults = await fastify.pg.query(totalCountQuery)

      const totalUsersQuery = SQL`
        select count(*) as users_count
        from users b;
      `

      /** @type {QueryResult<TotalUsersRow>} */
      const totalUsersQueryResults = await fastify.pg.query(totalUsersQuery)

      const countsQuery = await getCountsSqlText()
      /** @type {QueryResult<CumulativeCountRawRow>} */
      const countsResults = await fastify.pg.query(countsQuery)

      /** @type {Map<string, YearCountMap>} */
      const countsByLabel = new Map()
      /** @type {Set<string>} */
      const yearSet = new Set()

      for (const row of countsResults.rows) {
        const numericYear = Number(row.year)
        const yearKey = Number.isFinite(numericYear) ? String(numericYear) : String(row.year)
        yearSet.add(yearKey)

        const entry = countsByLabel.get(row.label) ?? {}
        entry[yearKey] = String(row.cumulative_count ?? '0')
        countsByLabel.set(row.label, entry)
      }

      const yearKeys = Array.from(yearSet).sort((a, b) => Number(a) - Number(b))
      const labelOrder = ['Users', 'Bookmarks', 'Tags', 'Episodes', 'Archives']
      /** @type {CumulativeCountRow[]} */
      const cumulativeCounts = []

      /**
       * @param {string} label
       * @param {YearCountMap | undefined} entry
       */
      const pushRow = (label, entry) => {
        /** @type {CumulativeCountRow} */
        const row = { label }
        for (const yearKey of yearKeys) {
          row[yearKey] = entry?.[yearKey] ?? '0'
        }
        cumulativeCounts.push(row)
      }

      for (const label of labelOrder) {
        const entry = countsByLabel.get(label)
        if (entry) {
          pushRow(label, entry)
        }
      }

      for (const [label, entry] of countsByLabel.entries()) {
        if (!labelOrder.includes(label)) {
          pushRow(label, entry)
        }
      }

      /** @type {ReturnBody} */
      const returnBody = {
        bookmarkStats: monthBookmarkCountResults.rows,
        totalUsers: totalUsersQueryResults.rows,
        totalBookmarks: totalCountResults.rows,
        cumulativeCounts,
      }

      return reply.code(200).send(returnBody)
    }
  )
}
