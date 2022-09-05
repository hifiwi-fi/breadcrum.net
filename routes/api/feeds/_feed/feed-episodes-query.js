import SQL from '@nearform/sql'

export function getFeedEpisodesQuery ({
  userId,
  feedId
}) {
  const episodesQuery = SQL`
    select
      e.id,
      e.created_at,
      e.updated_at,
      e.url as src_url,
      e.type,
      e.medium,
      e.size_in_bytes,
      e.duration_in_seconds,
      e.mime_type,
      e.explicit,
      e.author_name,
      e.filename,
      e.ext,
      e.src_type,
      e.ready,
      bm.id as bookmark_id,
      bm.url as bookmark_url,
      bm.title,
      bm.note
    from episodes e
    join bookmarks bm
    on bm.id = e.bookmark_id
    where e.owner_id = ${userId}
    and bm.owner_id = ${userId}
    and e.podcast_feed_id = ${feedId}
    and e.ready = true
    and e.error is null
    order by e.created_at desc, bm.title desc, e.filename desc
    fetch first 100 rows only;
  `

  return episodesQuery
}
