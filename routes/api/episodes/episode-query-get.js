import SQL from '@nearform/sql'

/**
 * @typedef {import('@nearform/sql').SqlStatement} SqlStatement
 */

/**
 * Generate an SQL query for fetching episode properties, including
 * additional related information like podcast feed and bookmark details.
 *
 * @param {Object} options - Query options.
 * @param {number|string} options.ownerId - ID of the episode owner.
 * @param {number|string} [options.episodeId] - Specific ID of the episode to query.
 * @param {Date|string} [options.before] - Timestamp to fetch episodes created before.
 * @param {boolean} [options.sensitive] - Whether to include sensitive episodes.
 * @param {boolean} [options.ready] - Whether to filter episodes by readiness.
 * @param {number} [options.perPage] - Number of episodes to return per page (not used in current implementation).
 * @param {number|string} [options.feedId] - ID of the podcast feed.
 * @param {number|string} [options.bookmarkId] - ID of the bookmark.
 * @param {boolean} [options.includeFeed] - Whether to include podcast feed details.
 * @param {string} [options.query] - Text query for episode search.
 * @param {boolean} [options.includeRank] - Include the rank column
 *
 * @returns {SqlStatement} Generated SQL query.
 */
export function episodePropsQuery ({
  ownerId,
  episodeId,
  before,
  sensitive,
  ready,
  perPage,
  feedId,
  bookmarkId,
  includeFeed,
  query,
  includeRank
}) {
  return SQL`
  select
      ep.id,
      ep.podcast_feed_id,
      ep.created_at,
      ep.updated_at,
      ${includeRank ? SQL`ts_rank(ep.tsv,  websearch_to_tsquery('english', ${query})) AS rank,` : SQL``}
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
      ep.author_url,
      ep.filename,
      ep.ext,
      ep.src_type,
      ep.thumbnail,
      ep.text_content,
      ep.ready,
      ep.error,
      ${includeFeed
        ? SQL`
          json_build_object(
            'id', pf.id,
            'creacted_at', pf.created_at,
            'updated_at', pf.updated_at,
            'title', pf.title,
            'description', pf.description,
            'image_url', pf.image_url,
            'explicit', pf.explicit,
            'default_feed', (pf.id = u.default_podcast_feed_id)
          ) as podcast_feed,
        `
        : SQL``}
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
    ${includeFeed
      ? SQL`
        join podcast_feeds pf
        on ep.podcast_feed_id = pf.id
        join users u
        on ep.owner_id = u.id
      `
      : SQL``}
    where ep.owner_id = ${ownerId}
    and bm.owner_id = ${ownerId}
    ${includeFeed ? SQL`and pf.owner_id = ${ownerId}` : SQL``}
    ${feedId ? SQL`and ep.podcast_feed_id = ${feedId}` : SQL``}
    ${bookmarkId ? SQL`and ep.bookmark_id = ${bookmarkId}` : SQL``}
    ${episodeId ? SQL`and ep.id = ${episodeId}` : SQL``}
    ${before ? SQL`and ep.created_at < ${before}` : SQL``}
    ${!sensitive ? SQL`and sensitive = false` : SQL``}
    ${ready != null ? SQL`and ready = ${ready}` : SQL``}
  `
}

export function getEpisodesQuery ({
  ownerId,
  episodeId,
  before,
  sensitive,
  ready,
  perPage,
  feedId,
  bookmarkId,
  includeFeed
}) {
  const episodesQuery = SQL`
    ${episodePropsQuery({
        ownerId,
        episodeId,
        before,
        sensitive,
        ready,
        perPage,
        feedId,
        bookmarkId,
        includeFeed
    })}
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
  feedId,
  bookmarkId
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
      ${bookmarkId ? SQL`and ep.bookmark_ud = ${bookmarkId}` : SQL``}
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
