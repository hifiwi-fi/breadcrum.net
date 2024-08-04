/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 * @import { TypeEpisodeRead } from './schemas/schema-episode-read.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {EpisodeQueryOptions & {
 *   fastify: FastifyInstance,
 *   pg?: PoolClient | FastifyInstance['pg']
 * }} GetEpisodesParams
 */

/**
 * Retrieves a single episode based on the provided query parameters.
 *
 * @function getEpisode
 * @param {GetEpisodesParams} getEpisodesParams - Parameters to shape the query.
 * @returns {Promise<TypeEpisodeRead| undefined>} An episode object or null if not found.
 */
export async function getEpisode (getEpisodesParams) {
  /** @type {TypeEpisodeRead | undefined } */
  const episode = (await getEpisodes(getEpisodesParams))?.[0]
  return episode
}

/**
 * Retrieves episodes based on the provided query parameters.
 *
 * @function getEpisodes
 * @param {GetEpisodesParams} getEpisodesParams - Parameters to shape the query.
 * @returns {Promise<TypeEpisodeRead[]>} An array of episode objects.
 */
export async function getEpisodes (getEpisodesParams) {
  const { fastify, pg, ...getEpisodesQueryParams } = getEpisodesParams
  const client = pg ?? fastify.pg
  const query = getEpisodesQuery(getEpisodesQueryParams)

  const results = await client.query(query)
  /** @type {TypeEpisodeRead[]} */
  const episodes = results.rows
  return episodes
}

/**
 * @typedef {Object} EpisodeQueryOptions
 * @property {string} ownerId - ID of the episode owner.
 * @property {string | null | undefined} [episodeId] - Specific ID of the episode to query.
 * @property {string | Date | null | undefined} [before] - Timestamp to fetch episodes created before.
 * @property {string | Date | null | undefined} [after] - Timestamp to fetch episodes created after.
 * @property {boolean | null | undefined} [sensitive] - Whether to include sensitive episodes.
 * @property {boolean | null | undefined} [ready] - Whether to filter episodes by readiness.
 * @property {number | null | undefined} [perPage] - Number of episodes to return per page (not used in current implementation).
 * @property {string | null | undefined} [feedId] - ID of the podcast feed.
 * @property {string | null | undefined} [bookmarkId] - ID of the bookmark.
 * @property {boolean | null | undefined} [includeFeed] - Whether to include podcast feed details.
 * @property {string | null | undefined} [query] - Text query for episode search.
 * @property {boolean | null | undefined} [includeRank] - Include the rank column.
 */

/**
 * Generate an SQL query for fetching episode properties, including
 * additional related information like podcast feed and bookmark details.
 *
 * @param {EpisodeQueryOptions} options - Query options.
 * @returns {SQL.SqlStatement} Generated SQL query.
 */
export function episodePropsQuery ({
  ownerId,
  episodeId,
  before,
  after,
  sensitive,
  ready,
  feedId,
  bookmarkId,
  includeFeed,
  query,
  includeRank,
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
    ${after ? SQL`and ep.created_at >= ${after}` : SQL``}
    ${!sensitive ? SQL`and sensitive = false` : SQL``}
    ${ready != null ? SQL`and ready = ${ready}` : SQL``}
  `
}

/**
 * Generate an SQL query for fetching episode properties, including
 * additional related information like podcast feed and bookmark details.
 *
 * @param {EpisodeQueryOptions} options - Query options.
 * @returns {SQL.SqlStatement} Generated SQL query.
 */
export function getEpisodesQuery ({
  ownerId,
  episodeId,
  before,
  after,
  sensitive,
  ready,
  perPage,
  feedId,
  bookmarkId,
  includeFeed,
}) {
  const episodesQuery = SQL`
    with episodes_page as (
      ${episodePropsQuery({
        ownerId,
        episodeId,
        before,
        after,
        sensitive,
        ready,
        perPage,
        feedId,
        bookmarkId,
        includeFeed,
        })
      }
      order by ${after
      ? SQL`ep.created_at asc, ep.title asc, ep.url asc`
      : SQL`ep.created_at desc, ep.title desc, ep.url desc`
    }
    ${perPage != null ? SQL`fetch first ${perPage} rows only` : SQL``}
  )
  select *
  from episodes_page ep
  order by ep.created_at desc, ep.url desc, ep.title desc
  `

  return episodesQuery
}
