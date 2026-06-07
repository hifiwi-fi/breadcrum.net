import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from '@breadcrum/resources/feeds/default-feed-query.js'
import { getFeedsQuery } from './feeds-query.js'
import { getFeedQuery } from './_feed/feed-query.js'
import { getFeedWithDefaults } from './feed-defaults.js'
import { getFeedUrl } from './feed-urls.js'

/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {object} FeedDetails
 * @property {string} id
 * @property {Date | string} created_at
 * @property {Date | string | undefined} [updated_at]
 * @property {string} title
 * @property {string} description
 * @property {string} image_url
 * @property {boolean} explicit
 * @property {string} token
 * @property {string} feed_url
 * @property {boolean} default_feed
 */

/**
 * @typedef {FeedDetails & { episode_count?: number }} FeedListItem
 */

/**
 * @typedef {{ ok: true, feed: FeedDetails }} FeedUpdateSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 404 | 422, message: string }} FeedUpdateFailure
 */

/**
 * @typedef {FeedUpdateSuccess | FeedUpdateFailure} FeedUpdateResult
 */

/**
 * @typedef {object} FeedUpdateInput
 * @property {string | undefined} [title]
 * @property {string | undefined} [description]
 * @property {string | undefined} [image_url]
 * @property {boolean | undefined} [explicit]
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @returns {Promise<FeedListItem[]>}
 */
export async function listFeeds (fastify, { userId }) {
  return fastify.pg.transact(async client => {
    await getOrCreateDefaultFeed({ userId, client })

    const feedsResults = await client.query(getFeedsQuery({ userId }))
    return feedsResults.rows.map(feed => /** @type {FeedListItem} */ ({
      ...getFeedWithDefaults({
        feed,
        transport: fastify.config.TRANSPORT,
        host: fastify.config.HOST,
      }),
      episode_count: Number(feed.episode_count ?? 0),
    }))
  })
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @returns {Promise<FeedDetails | null>}
 */
export async function getDefaultFeedDetails (fastify, { userId }) {
  const feedId = await getOrCreateDefaultFeed({ userId, client: fastify.pg })
  return getFeedDetailsById(fastify, { userId, feedId })
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.feedId
 * @returns {Promise<FeedDetails | null>}
 */
export async function getFeedDetailsById (fastify, { userId, feedId }) {
  const feedResults = await fastify.pg.query(getFeedQuery({
    ownerId: userId,
    feedId,
  }))
  const feed = feedResults.rows[0]
  if (!feed) return null

  return /** @type {FeedDetails} */ ({
    ...getFeedWithDefaults({
      feed,
      transport: fastify.config.TRANSPORT,
      host: fastify.config.HOST,
    }),
    feed_url: getFeedUrl({
      transport: fastify.config.TRANSPORT,
      host: fastify.config.HOST,
      userId,
      token: feed.token,
      feedId: feed.id,
    }),
  })
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.feedId
 * @param {FeedUpdateInput} params.input
 * @returns {Promise<FeedUpdateResult>}
 */
export async function updateFeedDetails (fastify, { userId, feedId, input }) {
  if (!feedId) return feedUpdateFailure(422, 'Feed id is required')

  /** @type {SQL.SqlStatement[]} */
  const updates = []

  if (input.title != null) updates.push(SQL`title = ${input.title}`)
  if (input.description != null) updates.push(SQL`description = ${input.description}`)
  if (input.image_url != null) updates.push(SQL`image_url = ${input.image_url || null}`)
  if (input.explicit != null) updates.push(SQL`explicit = ${input.explicit}`)

  if (updates.length > 0) {
    const query = SQL`
      update podcast_feeds
      set ${SQL.glue(updates, ' , ')}
      where id = ${feedId}
        and owner_id = ${userId}
      returning id;
    `

    const results = await fastify.pg.query(query)
    if (results.rows.length === 0) {
      return feedUpdateFailure(404, `Podcast feed ${feedId} not found`)
    }

    fastify.otel.podcastFeedEditCounter.add(1)
  }

  const feed = await getFeedDetailsById(fastify, { userId, feedId })
  if (!feed) return feedUpdateFailure(404, `Podcast feed ${feedId} not found`)

  return {
    ok: true,
    feed,
  }
}

/**
 * @param {404 | 422} statusCode
 * @param {string} message
 * @returns {FeedUpdateFailure}
 */
function feedUpdateFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
