/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 * @import { SqlStatement } from '@nearform/sql'
 */

import SQL from '@nearform/sql'
import Useragent from 'useragent'

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

  /** @type {QueryResult<AdminUsersQueryReadDbResult>} */
  const results = await client.query(query)

  /** @type {AdminUsersQueryRead[]} */
  const users = results.rows.map(parseUserAgents)
  return users
}

/**
 *
 * @param {AdminUsersQueryReadDbResult} user
 * @returns AdminUsersQueryRead
 */
export function parseUserAgents (user) {
  return {
    ...user,
    user_agent: parseUserAgentString(user.user_agent),
    registration_user_agent: parseUserAgentString(user.registration_user_agent),
    geoip: null,
    registration_geoip: null,
  }
}

/**
 *
 * @param {string | null} userAgent
 * @returns {UserAgentJson | null}
 */
function parseUserAgentString (userAgent) {
  if (!userAgent) return null
  const parsedAgent = Useragent.lookup(userAgent)
  return parsedAgent
    ? {
        family: parsedAgent.family,
        major: parsedAgent.major,
        minor: parsedAgent.minor,
        patch: parsedAgent.patch,
        device: { ...parsedAgent.device },
        os: { ...parsedAgent.os },
        raw: userAgent
      }
    : null
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
 * @property {UserAgentJson | null} user_agent
 * @property {GeoIpRegion | null} geoip
 * @property {string | null} registration_ip
 * @property {UserAgentJson | null} registration_user_agent
 * @property {GeoIpRegion | null} registration_geoip
 * @property {string | null} subscription_provider
 * @property {string | null} subscription_status
 * @property {string | null} subscription_plan
 * @property {string | null} subscription_display_name
 * @property {Date | null} subscription_period_end
 * @property {boolean | null} subscription_cancel_at_period_end
 * @property {string | null} stripe_customer_id
 */

/**
 * @typedef {object} Device
 * @property {string} family
 * @property {string} major
 * @property {string} minor
 * @property {string} patch
 */

/**
 * @typedef {object} OS
 * @property {string} family
 * @property {string} major
 * @property {string} minor
 * @property {string} patch
 */

/**
 * @typedef {object} UserAgentJson
 * @property {string} family
 * @property {string} major
 * @property {string} minor
 * @property {string} patch
 * @property {Device} device
 * @property {OS} os
 * @property {string} raw
 */

/**
 * @typedef {object} GeoIpRegion
 * @property {string | null} country_iso
 * @property {string | null} country_name
 * @property {string | null} flag_emoji
 * @property {string | null} region_iso
 * @property {string | null} region_name
 * @property {string | null} city_name
 * @property {string | null} time_zone
 */

/**
 * @typedef {Omit<AdminUsersQueryRead, 'user_agent' | 'registration_user_agent' | 'geoip' | 'registration_geoip'> & {
 *   user_agent: string | null,
 *   registration_user_agent: string | null
 * }} AdminUsersQueryReadDbResult
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
    ),
    latest_subscriptions as (
      select distinct on (user_id)
        s.user_id,
        s.provider as subscription_provider,
        case
          when s.provider = 'stripe' then ss.status
          when s.provider = 'custom' then cs.status
          else null
        end as subscription_status,
        case
          when s.provider = 'stripe' then ss.plan_code
          when s.provider = 'custom' then cs.plan_code
          else null
        end as subscription_plan,
        cs.display_name as subscription_display_name,
        case
          when s.provider = 'stripe' then ss.current_period_end
          when s.provider = 'custom' then cs.current_period_end
          else null
        end as subscription_period_end,
        case
          when s.provider = 'stripe' then ss.cancel_at_period_end
          else false
        end as subscription_cancel_at_period_end
      from subscriptions s
      left join stripe_subscriptions ss
        on ss.subscription_id = s.id
        and s.provider = 'stripe'
      left join custom_subscriptions cs
        on cs.subscription_id = s.id
        and s.provider = 'custom'
      where s.user_id in (select id from users_page)
      order by s.user_id, s.updated_at desc nulls last, s.created_at desc
    ),
    stripe_customer as (
      select user_id, stripe_customer_id
      from stripe_customers
      where user_id in (select id from users_page)
    )
    select
      u.*,
      lt.last_seen,
      lt.ip,
      lt.user_agent,
      ls.subscription_provider,
      ls.subscription_status,
      ls.subscription_plan,
      ls.subscription_display_name,
      ls.subscription_period_end,
      ls.subscription_cancel_at_period_end,
      sc.stripe_customer_id
    from users_page u
    left join latest_tokens lt
    on u.id = lt.owner_id
    left join latest_subscriptions ls
    on u.id = ls.user_id
    left join stripe_customer sc
    on u.id = sc.user_id
    order by u.created_at desc, u.username desc
  `

  return usersQuery
}
