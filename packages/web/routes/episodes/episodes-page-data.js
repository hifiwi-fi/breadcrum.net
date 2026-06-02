/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeEpisodeRead } from '../api/episodes/schemas/schema-episode-read.js'
 */

import { getOrCreateDefaultFeed } from '@breadcrum/resources/feeds/default-feed-query.js'
import { addMillisecond } from '../api/bookmarks/addMillisecond.js'
import { getEpisodes } from '../api/episodes/episode-query-get.js'
import { getFeedWithDefaults } from '../api/feeds/feed-defaults.js'
import { hydrateEmbed } from '../api/episodes/hydrate-embed.js'

/**
 * @typedef {object} EpisodeFilters
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {number} perPage
 * @property {boolean} sensitive
 * @property {string} bookmarkId
 * @property {string} feedId
 * @property {boolean} defaultFeed
 * @property {boolean | null} ready
 * @property {string} queryString
 */

/**
 * @typedef {object} EpisodePagination
 * @property {Date | null} before
 * @property {Date | null} after
 * @property {boolean} top
 * @property {boolean} bottom
 */

/**
 * @typedef {object} EpisodesPageData
 * @property {TypeEpisodeRead[]} episodes
 * @property {EpisodePagination} pagination
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {EpisodeFilters} params.filters
 * @returns {Promise<EpisodesPageData>}
 */
export async function getEpisodesPageData (fastify, { userId, filters }) {
  return fastify.pg.transact(async client => {
    const feedId = filters.defaultFeed
      ? await getOrCreateDefaultFeed({ client, userId })
      : filters.feedId || null

    const rows = await getEpisodes({
      fastify,
      pg: client,
      ownerId: userId,
      before: filters.before ? filters.before.toISOString() : null,
      after: filters.after ? filters.after.toISOString() : null,
      sensitive: filters.sensitive,
      ready: filters.ready,
      perPage: filters.perPage + 1,
      feedId,
      bookmarkId: filters.bookmarkId || null,
      includeFeed: true,
    })

    const top = Boolean(
      (!filters.before && !filters.after) ||
      (filters.after && rows.length <= filters.perPage)
    )
    const bottom = Boolean(
      (filters.before && rows.length <= filters.perPage) ||
      (!filters.before && !filters.after && rows.length <= filters.perPage)
    )

    if (rows.length > filters.perPage) {
      if (filters.after) {
        rows.shift()
      } else {
        rows.pop()
      }
    }

    for (const episode of rows) {
      hydrateEmbed(episode)
      episode.podcast_feed = getFeedWithDefaults({
        feed: episode.podcast_feed,
        transport: fastify.config.TRANSPORT,
        host: fastify.config.HOST,
      })
    }

    return {
      episodes: rows,
      pagination: {
        before: bottom ? null : rows.at(-1)?.created_at ?? null,
        after: top ? null : addMillisecond(rows[0]?.created_at),
        top,
        bottom,
      },
    }
  })
}
