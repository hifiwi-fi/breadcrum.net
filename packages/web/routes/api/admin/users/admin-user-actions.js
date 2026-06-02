/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { AdminUsersQueryRead } from './get-admin-users-query.js'
 */

import { addMillisecond } from '../../bookmarks/addMillisecond.js'
import { getAdminUsers } from './get-admin-users-query.js'

/**
 * @typedef {object} AdminUsersPagination
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 * @property {boolean} bottom
 */

/**
 * @typedef {object} AdminUsersListResult
 * @property {AdminUsersQueryRead[]} data
 * @property {AdminUsersPagination} pagination
 */

/**
 * @param {object} params
 * @param {FastifyInstance} params.fastify
 * @param {PgClient} [params.pg]
 * @param {Date | string | undefined} [params.before]
 * @param {Date | string | undefined} [params.after]
 * @param {number} params.perPage
 * @param {string | undefined} [params.username]
 * @returns {Promise<AdminUsersListResult>}
 */
export async function listAdminUsersForAdmin ({
  fastify,
  pg,
  before,
  after,
  perPage,
  username,
}) {
  const pageSize = Math.max(1, Math.min(perPage, 200))
  const results = await getAdminUsers({
    fastify,
    ...(pg ? { pg } : {}),
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    perPage: pageSize + 1,
    ...(username ? { username } : {}),
  })

  const top = Boolean(
    (!before && !after) ||
    (after && results.length <= pageSize)
  )
  const bottom = Boolean(
    (before && results.length <= pageSize) ||
    (!before && !after && results.length <= pageSize)
  )

  if (results.length > pageSize) {
    if (after) {
      results.shift()
    } else {
      results.pop()
    }
  }

  const nextPage = bottom ? null : results.at(-1)?.created_at ?? null
  const prevPage = top ? null : addMillisecond(results[0]?.created_at) ?? null
  const geoipLookup = fastify.geoip?.lookup

  const users = results.map(user => ({
    ...user,
    geoip: geoipLookup && user.ip
      ? geoipLookup(user.ip)
      : null,
    registration_geoip: geoipLookup && user.registration_ip
      ? geoipLookup(user.registration_ip)
      : null,
  }))

  return {
    data: users,
    pagination: {
      before: nextPage,
      after: prevPage,
      top,
      bottom,
    },
  }
}
