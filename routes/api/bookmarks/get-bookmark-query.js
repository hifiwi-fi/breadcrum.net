import SQL from '@nearform/sql'

export const getBookmarksQuery = ({
  tag,
  ownerId,
  bookmarkId,
  before,
  url,
  sensitive,
  perPage
}) => {
  console.log({
    tag,
    ownerId,
    bookmarkId,
    before,
    url,
    sensitive,
    perPage
  })
  return SQL`
        with bookmark_page as (
          select bm.*
          from bookmarks bm
          ${tag
              ? SQL`
                left join bookmarks_tags bt
                on bm.id = bt.bookmark_id
                left join tags t
                on t.id = bt.tag_id`
              : SQL``}
          where bm.owner_id = ${ownerId}
          ${bookmarkId ? SQL`and bm.id = ${bookmarkId}` : SQL``}
          ${before ? SQL`and bm.created_at < ${before}` : SQL``}
          ${url ? SQL`and url = ${url}` : SQL``}
          ${!sensitive ? SQL`and sensitive = false` : SQL``}
          ${tag ? SQL`and t.name = ${tag} and t.owner_id = ${ownerId}` : SQL``}
          order by bm.created_at desc, bm.title desc, bm.url desc
          ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
        ),
        bookark_page_tags_array as (
          select bm.id as bookmark_id, array_agg(t.name) as tag_array
          from bookmark_page bm
          left outer join bookmarks_tags bt
          on bm.id = bt.bookmark_id
          left outer join tags t
          on t.id = bt.tag_id
          where bm.owner_id = ${ownerId}
          and t.owner_id = ${ownerId}
          group by bm.id
        ),
        bookark_page_episodes_array as (
          select bm.id as bookmark_id, jsonb_strip_nulls(jsonb_agg(
            case
            when ep.id is null then null
            else jsonb_strip_nulls(jsonb_build_object(
              'episode_id', ep.id,
              'created_at', ep.created_at,
              'updated_at', ep.updated_at,
              'url', ep.url,
              'type', ep.type,
              'medium', ep.medium,
              'size_in_bytes', ep.size_in_bytes,
              'duration_in_seconds', ep.duration_in_seconds,
              'mime_type', ep.mime_type,
              'explicit', ep.explicit,
              'author_name', ep.author_name,
              'filename', ep.filename,
              'ext', ep.ext,
              'src_type', ep.src_type,
              'ready', ep.ready,
              'error', ep.error
            ))
            end)
          ) episodes
          from bookmark_page bm
          left outer join episodes ep
          on ep.bookmark_id = bm.id
          where bm.owner_id = ${ownerId}
          and ep.owner_id = ${ownerId}
          group by bm.id
        )
        select
          b.id,
          b.url,
          b.title,
          b.note,
          b.created_at,
          b.updated_at,
          b.toread,
          b.sensitive,
          b.starred,
          coalesce(array_to_json(tag_array), '[]'::json)::jsonb as tags,
          coalesce(episodes, '[]'::jsonb) as episodes
        from bookmark_page b
        left outer join bookark_page_tags_array
        on bookark_page_tags_array.bookmark_id = b.id
        left outer join bookark_page_episodes_array
        on bookark_page_episodes_array.bookmark_id = b.id
        order by b.created_at desc, b.title desc, b.url desc
      `
}

export const afterToBeforeQuery = ({
  perPage,
  tag,
  ownerId,
  after,
  sensitive
}) => {
  const perPageAfterOffset = perPage + 2
  const afterCalcQuery = SQL`
          with page as (
            select bm.id, bm.url, bm.title, bm.created_at
            from bookmarks bm
            ${tag
              ? SQL`
                left join bookmarks_tags bt
                on bm.id = bt.bookmark_id
                left join tags t
                on t.id = bt.tag_id`
              : SQL``}
            where bm.owner_id = ${ownerId}
            and bm.created_at >= ${after}
            ${!sensitive ? SQL`AND bm.sensitive = false` : SQL``}
            ${tag
              ? SQL`
                and t.name = ${tag}
                and t.owner_id = ${ownerId}`
              : SQL``}
            order by bm.created_at ASC, bm.title ASC, bm.url ASC
            fetch first ${perPageAfterOffset} rows only
          ),
          bookmark_with_last_row_date as (
            select last_value(page.created_at) over (
                  order by page.created_at
                  range between
                      UNBOUNDED PRECEDING AND
                      UNBOUNDED FOLLOWING
              ) last_created_at
            from page
          )
          select count(*)::int as bookmark_count, last_created_at
          from bookmark_with_last_row_date
          group by last_created_at`

  return afterCalcQuery
}
