/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { SqlStatement } from '@nearform/sql'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} GetAdminUsersQueryParams
 * @property {string} [userId] - The unique identifier of the user to filter by. Optional.
 * @property {string | undefined} [username] - The username of the user to filter by. Optional.
 * @property {Date|string|undefined} [before] - Filters users created before this date. Optional.
 * @property {Date|string|undefined} [after] - Filters users created after this date. Optional.
 * @property {number} [perPage] - The number of users to fetch per page. If not provided, fetches all users. Optional.
 */

/**
 * @typedef {GetAdminUsersQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PgClient
 * }} GetAdminUsersParams
 */

/**
 * Retrieves a single admin user based on the provided query parameters.
 *
 * @function getAdminUser
 * @param {GetAdminUsersParams} getAdminUsersParams - Parameters to shape the query.
 * @returns {Promise<AdminUsersQueryRead | undefined>} An admin user object or undefined if not found.
 */
export async function getAdminUser (getAdminUsersParams) {
  const user = (await getAdminUsers(getAdminUsersParams))[0]
  return user
}

/**
 * Retrieves admin users based on the provided query parameters.
 *
 * @function getAdminUsers
 * @param {GetAdminUsersParams} getAdminUsersParams - Parameters to shape the query.
 * @returns {Promise<AdminUsersQueryRead[]>} An array of admin user objects.
 */
export async function getAdminUsers (getAdminUsersParams) {
  const { fastify, pg, ...getAdminUsersQueryParams } = getAdminUsersParams
  const client = pg ?? fastify.pg
  const query = getAdminUsersQuery(getAdminUsersQueryParams)

  /** @type {QueryResult<AdminUsersQueryRead>} */
  const results = await client.query(query)

  /** @type {AdminUsersQueryRead[]} */
  const users = results.rows
  return users
}

/**
 * @typedef {object} AdminUsersQueryRead
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {string | null} pending_email_update
 * @property {boolean} newsletter_subscription
 * @property {boolean} disabled
 * @property {string | null} disabled_reason
 * @property {string | null} internal_note
 * @property {boolean} admin
 * @property {boolean} disabled_email
 * @property {Date | null} last_seen
 * @property {string | null} ip
 * @property {string | null} user_agent
 * @property {string | null} registration_ip
 * @property {string | null} registration_user_agent
 */

/**
 * Constructs a SQL query to fetch details of all user types for administrative purposes.
 *
 * @param {GetAdminUsersQueryParams} params - Parameters to shape the query.
 * @returns {SqlStatement} SQL template literal representing the admin users query.
 *
 * @example
 * // Fetch all users for admin
 * getAdminUsersQuery({});
 *
 * // Fetch user with userId 5 for admin
 * getAdminUsersQuery({ userId: 5 });
 *
 * // Fetch first 10 users created before '2023-08-21' for admin
 * getAdminUsersQuery({ before: '2023-08-21', perPage: 10 });
 *
 * @note This function is intended for admin-only routes.
 */
export const getAdminUsersQuery = ({
  userId,
  username,
  before,
  after,
  perPage,
}) => {
  const usersQuery = SQL`
    with users_page as (
      select
          u.id,
          u.email,
          u.username,
          u.email_confirmed,
          u.created_at,
          u.updated_at,
          u.pending_email_update,
          u.newsletter_subscription,
          u.disabled,
          u.disabled_reason,
          u.internal_note,
          u.admin,
          coalesce(bh.disabled, false) as disabled_email,
          u.registration_ip,
          u.registration_user_agent
        from users u
        left join email_blackhole bh
        on u.email = bh.email
        where 1=1
        ${userId ? SQL`and u.id = ${userId}` : SQL``}
        ${username ? SQL`and u.username = ${username}` : SQL``}
        ${before ? SQL`and u.created_at < ${before}` : SQL``}
        ${after ? SQL`and u.created_at >= ${after}` : SQL``}
        order by ${after
          ? SQL`u.created_at asc, u.username asc`
          : SQL`u.created_at desc, u.username desc`
        }
        ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
    ),
    latest_tokens as (
      select distinct on (owner_id)
        owner_id,
        last_seen,
        ip,
        user_agent
      from auth_tokens
      where owner_id in (select id from users_page)
      order by owner_id, last_seen desc
    )
    select
      u.*,
      lt.last_seen,
      lt.ip,
      lt.user_agent
    from users_page u
    left join latest_tokens lt
    on u.id = lt.owner_id
    order by u.created_at desc, u.username desc
  `

  return usersQuery
}
