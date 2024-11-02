import SQL from '@nearform/sql'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 * @import { PostgresDb } from '@fastify/postgres'
 */

/**
 * Put tags on a bookmark query
 *
 * @function putTagsQuery
 * @exports
 * @param {Object} params - Parameters to shape the query.
 * @param {FastifyInstance} params.fastify - Fastify instance, used for logging and other utilities.
 * @param {PoolClient | PostgresDb?} [params.pg] - PostgreSQL connection or transaction client for executing the query.
 * @param {string} params.userId - UserID of the owner
 * @param {string} params.bookmarkId - The Bookmark ID to add tags to
 * @param {Array<string>} params.tags- List of tags to associate with the bookmark.
 */
export async function putTagsQuery ({
  fastify,
  pg,
  userId,
  bookmarkId,
  tags,
}) {
  // @ts-ignore
  pg = pg ?? fastify.pg

  if (!pg) throw new Error('A postgres client is required')

  const createTags = SQL`
    insert into tags (name, owner_id)
    values
    ${SQL.glue(
      tags.map(tag => SQL`(${tag},${userId})`),
      ' , '
    )}
    on conflict (name, owner_id)
    do update
    set name = EXCLUDED.name
    returning id, name, created_at, updated_at;`

  const tagsResults = await pg.query(createTags)

  const applyTags = SQL`
    insert into bookmarks_tags (bookmark_id, tag_id)
    values
    ${SQL.glue(
      tagsResults.rows.map(tag => SQL`(${bookmarkId},${tag.id})`),
      ' , '
    )};`

  await pg.query(applyTags)

  // @ts-ignore
  fastify.prom.tagAppliedCounter.inc(tagsResults.rows.length)
}
