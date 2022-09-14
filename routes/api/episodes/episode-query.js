import SQL from '@nearform/sql'

export function getEpisodesQuery ({
  ownerId,
  episodeId,
  before,
  sensitive,
  perPage,
  feedId
}) {
  const episodesQuery = SQL`
    select
      ep.id,
      ep.podcast_feed_id,
      ep.created_at,
      ep.updated_at,
      ep.url,
      ep.title,
      coalesce (ep.title, bm.title) as display_title,
      ep.type,
      ep.medium,
      ep.size_in_bytes,
      ep.duration_in_seconds,
      ep.mime_type,
      ep.explicit,
      ep.author_name,
      ep.filename,
      ep.ext,
      ep.src_type,
      ep.ready,
      ep.error,
      jsonb_build_object(
        'id', bm.id,
        'url', bm.url,
        'title', bm.title,
        'note', bm.note,
        'created_at', bm.created_at,
        'updated_at', bm.updated_at,
        'starred', bm.starred,
        'toread', bm.toread,
        'sensitive', bm.sensitive
      ) as bookmark
    from episodes ep
    join bookmarks bm
    on ep.bookmark_id = bm.id
    where ep.owner_id = ${ownerId}
    and bm.owner_id = ${ownerId}
    ${feedId ? SQL`and ep.podcast_feed_id = ${feedId}` : SQL``}
    ${episodeId ? SQL`and ep.id = ${episodeId}` : SQL``}
    ${before ? SQL`and ep.created_at < ${before}` : SQL``}
    ${!sensitive ? SQL`and sensitive = false` : SQL``}
    order by ep.created_at desc, ep.url desc, bm.title desc
    ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
  `

  return episodesQuery
}

export function afterToBeforeEpisodesQuery ({
  perPage,
  ownerId,
  after,
  sensitive,
  feedId
}) {
  const perPageAfterOffset = perPage + 2

  const afterCalcEpisodesQuery = SQL`
    with page as (
      select ep.id, ep.created_at
      from episodes ep
      ${!sensitive
          ? SQL`
              join bookmarks bm
              on ep.bookmark_id = bm.id`
          : SQL``}
      where ep.owner_id = ${ownerId}
      and ep.created_at >= ${after}
      ${feedId ? SQL`and ep.podcast_feed_id = ${feedId}` : SQL``}
      ${!sensitive
        ? SQL`
          and bm.owner_id = ${ownerId}
          and bm.sensitive = false
        `
        : SQL``
      }
      order by ep.created_at ASC, ep.url ASC
      fetch first ${perPageAfterOffset} rows only
    ),
    episode_with_last_row_date as (
      select last_value(page.created_at) over (
        order by page.created_at
        range between
          UNBOUNDED PRECEDING AND
          UNBOUNDED FOLLOWING
      ) last_created_at
      from page
    )
    select count(*)::int as episode_count, last_created_at
    from episode_with_last_row_date
    group by last_created_at
  `

  return afterCalcEpisodesQuery
}
