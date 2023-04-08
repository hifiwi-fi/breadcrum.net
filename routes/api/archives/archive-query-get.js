import SQL from '@nearform/sql'

export function getArchivesQuery ({
  ownerID,
  archiveID,
  before,
  sensitive,
  ready,
  perPage,
  fullArchives
}) {
  const archivesQuery = SQL`
    select
      ar.id,
      ar.created_at,
      ar.updated_at,
      ar.url,
      ar.title,
      coalesce (ar.title, bm.title) as display_title,
      ar.site_name,
      ${fullArchives ? SQL`ar.html_content,` : SQL``}
      ${fullArchives ? SQL`ar.text_content,` : SQL``}
      ar.length,
      ar.excerpt,
      ar.byline,
      ar.direction,
      ar.language,
      ar.extraction_method,
      ar.ready,
      ar.error,
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
        /* tags? */
      ) as bookmark
    from archives ar
    join bookmarks bm
    on ar.bookmark_id = bm.id
    where ar.owner_id = ${ownerID}
    and bm.owner_id = ${ownerID}
    ${archiveID ? SQL`and ar.id = ${archiveID}` : SQL``}
    ${before ? SQL`and ar.created_at < ${before}` : SQL``}
    ${!sensitive ? SQL`and sensitive = false` : SQL``}
    ${ready != null ? SQL`and ready = ${ready}` : SQL``}
    order by ar.created_at desc, ar.url desc, bm.title desc
    ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
  `

  return archivesQuery
}

export function afterToBeforeArchivesQuery ({
  perPage,
  ownerID,
  after,
  sensitive
}) {
  const perPageAfterOffset = perPage + 2

  const afterCalcArchivesQuery = SQL`
    with page as (
      select ar.id, ar.created_at
      from archives ar
      ${!sensitive
          ? SQL`
              join bookmarks bm
              on ar.bookmark_id = bm.id`
          : SQL``}
      where ar.owner_id = ${ownerID}
      and ar.created_at >= ${after}
      ${!sensitive
        ? SQL`
          and bm.owner_id = ${ownerID}
          and bm.sensitive = false
        `
        : SQL``
      }
      order by ar.created_at ASC, ar.url ASC
      fetch first ${perPageAfterOffset} rows only
    ),
    archive_with_last_row_date as (
      select last_value(page.created_at) over (
        order by page.created_at
        range between
          UNBOUNDED PRECEDING AND
          UNBOUNDED FOLLOWING
      ) last_created_at
      from page
    )
    select count(*)::int as archive_count, last_created_at
    from archive_with_last_row_date
    group by last_created_at
  `

  return afterCalcArchivesQuery
}
