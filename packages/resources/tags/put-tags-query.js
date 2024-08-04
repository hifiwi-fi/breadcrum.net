import SQL from '@nearform/sql'

export async function putTagsQuery ({
  fastify,
  pg,
  userId,
  bookmarkId,
  tags,
}) {
  pg = pg ?? fastify.pg

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

  fastify.prom.tagAppliedCounter.inc(tagsResults.rows.length)
}
