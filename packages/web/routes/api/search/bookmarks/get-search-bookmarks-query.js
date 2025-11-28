import SQL from '@nearform/sql'
import {
  bookmarkTagsArray,
  bookmarkEpisodesArray,
  bookmarkArchivesArray,
} from '../../bookmarks/get-bookmarks-query.js'

/**
 * @typedef {import('@nearform/sql').SqlStatement} SqlStatement
 */

/**
 * Builds a SQL query for searching bookmarks with various filters
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query string
 * @param {string} params.ownerId - ID of the bookmark owner
 * @param {number} params.perPage - Number of results per page
 * @param {boolean} params.sensitive - Include sensitive bookmarks
 * @param {boolean} params.starred - Filter for starred bookmarks
 * @param {boolean} params.toread - Filter for unread bookmarks
 * @param {string} [params.lastRank] - Rank for pagination
 * @param {string} [params.lastId] - Last bookmark ID for pagination
 * @param {boolean} [params.reverse=false] - Reverse the sort order
 * @returns {SqlStatement} SQL query for searching bookmarks
 */
export function getSearchBookmarksQuery ({
  query,
  ownerId,
  perPage,
  sensitive,
  starred,
  toread,
  lastRank,
  lastId,
  reverse = false, // Add reverse argument, default to false
}) {
  const searchBookmarksQuery = SQL`
    with bookmark_page as (
      select bm.*, ts_rank(bm.tsv,  websearch_to_tsquery('english', ${query})) AS rank
      from bookmarks bm
      where bm.owner_id = ${ownerId}
      and tsv @@ plainto_tsquery('english', ${query})
      ${!sensitive ? SQL`and sensitive = false` : SQL``}
      ${starred ? SQL`and starred = true` : SQL``}
      ${toread ? SQL`and toread = true` : SQL``}
      ${
        lastRank
          ? !reverse
            ? SQL`
              and (
                ts_rank(tsv, plainto_tsquery('english', ${query})) < ${lastRank}
                ${lastId ? SQL`OR (ts_rank(tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND id > ${lastId})` : SQL``}
              )
            `
            : SQL`
              and (
                ts_rank(tsv, plainto_tsquery('english', ${query})) > ${lastRank}
                ${lastId ? SQL`OR (ts_rank(tsv, plainto_tsquery('english', ${query})) = ${lastRank} AND id < ${lastId})` : SQL``}
              )
            `
          : SQL``
      }
      order by
      ${!reverse ? SQL`rank desc, id asc, created_at desc` : SQL`rank asc, id desc, created_at asc`}
      ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
    ),
    bookark_page_tags_array as (
      ${bookmarkTagsArray({ ownerId })}
    ),
    bookark_page_episodes_array as (
      ${bookmarkEpisodesArray({ ownerId })}
    ),
    archives_array as (
      ${bookmarkArchivesArray({ ownerId, fullArchives: false })}
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
          b.summary,
          coalesce(array_to_json(tag_array), '[]'::json)::jsonb as tags,
          coalesce(episodes, '[]'::jsonb) as episodes,
          coalesce(archives, '[]'::jsonb) as archives,
          b.archive_urls,
          b.rank
        from bookmark_page b
        left outer join bookark_page_tags_array
        on bookark_page_tags_array.bookmark_id = b.id
        left outer join bookark_page_episodes_array
        on bookark_page_episodes_array.bookmark_id = b.id
        left outer join archives_array
        on archives_array.bookmark_id = b.id
        order by
        b.rank desc, b.id asc, created_at desc
  `

  return searchBookmarksQuery
}
