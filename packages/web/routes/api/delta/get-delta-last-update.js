/**
 * @import { FastifyInstance } from 'fastify'
 * @import { QueryResult } from 'pg'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} DeltaLastUpdateRow
 * @property {Date | null} last_update
 */

/**
 * @param {{ ownerId: string }} params
 * @returns {SQL.SqlStatement}
 */
export function getDeltaLastUpdateQuery ({ ownerId }) {
  return SQL`
    with bookmark_snapshot_updates as (
      select bm.updated_at as last_update
      from bookmarks bm
      where bm.owner_id = ${ownerId}

      union all

      select ar.updated_at as last_update
      from archives ar
      inner join bookmarks bm
      on bm.id = ar.bookmark_id
      where bm.owner_id = ${ownerId}
      and ar.owner_id = ${ownerId}

      union all

      select ep.updated_at as last_update
      from episodes ep
      inner join bookmarks bm
      on bm.id = ep.bookmark_id
      where bm.owner_id = ${ownerId}
      and ep.owner_id = ${ownerId}

      union all

      select t.updated_at as last_update
      from tags t
      inner join bookmarks_tags bt
      on bt.tag_id = t.id
      inner join bookmarks bm
      on bm.id = bt.bookmark_id
      where bm.owner_id = ${ownerId}
      and t.owner_id = ${ownerId}
    )
    select max(last_update) as last_update
    from bookmark_snapshot_updates
  `
}

/**
 * @param {{ fastify: FastifyInstance, ownerId: string, pg?: PgClient }} params
 * @returns {Promise<Date | null>}
 */
export async function getDeltaLastUpdate ({ fastify, ownerId, pg }) {
  const client = pg ?? fastify.pg
  const query = getDeltaLastUpdateQuery({ ownerId })

  /** @type {QueryResult<DeltaLastUpdateRow>} */
  const results = await client.query(query)

  return results.rows[0]?.last_update ?? null
}
