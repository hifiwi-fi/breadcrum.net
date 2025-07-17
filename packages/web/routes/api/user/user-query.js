/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeUserRead } from './schemas/schema-user-read.js'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 * @import { QueryResult } from 'pg'
 */

import SQL from '@nearform/sql'

/**
 * getUser returns the user object for a given userId
 * @typedef {GetUserQueryParams & {
 *   fastify: FastifyInstance,
 *   pg?: PgClient
 * }} GetUserParams
 */

/**
 * Retrieves and types the get user query
 * @param  {GetUserParams} getUserParams
 * @return {Promise<TypeUserRead | undefined >} The returned user if found
 */
export async function getUser (getUserParams) {
  const { fastify, pg, ...getUserQueryParams } = getUserParams
  const client = pg ?? fastify.pg
  const query = getUserQuery(getUserQueryParams)

  /** @type {QueryResult<TypeUserRead>} */
  const results = await client.query(query)
  return results.rows[0]
}

/**
 * @typedef {object} GetUserQueryParams
 * @property {string} userId = The ID of the user to retrieve
 */

/**
 * Constructs the getUser query.
 * @param {GetUserQueryParams} params
 * @returns {SQL.SqlStatement} The SQL query statement ready to be executed, constructed using the `@nearform/sql` library to safely include parameters.
 */
export function getUserQuery ({
  userId,
}) {
  const query = SQL`
    select
      u.id,
      u.email,
      u.username,
      u.email_confirmed,
      u.created_at,
      u.updated_at,
      u.pending_email_update,
      u.newsletter_subscription,
      u.admin,
      u.disabled,
      u.disabled_reason,
      coalesce(bh.disabled, false) as disabled_email
    from users u
    left join email_blackhole bh
    on u.email = bh.email
    where u.id = ${userId}`

  return query
}
