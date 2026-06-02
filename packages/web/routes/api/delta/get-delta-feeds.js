/**
 * @import { FastifyInstance } from 'fastify'
 * @import { QueryResult } from 'pg'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'
import { getFeedWithDefaults } from '../feeds/feed-defaults.js'
import { getFeedUrl } from '../feeds/feed-urls.js'

/**
 * @typedef {object} DeltaFeedRow
 * @property {string} id
 * @property {Date} created_at
 * @property {Date | null} updated_at
 * @property {string | null} title
 * @property {string | null} description
 * @property {string | null} image_url
 * @property {boolean | null} explicit
 * @property {string} token
 * @property {boolean} default_feed
 */

/**
 * @typedef {object} DeltaFeedRead
 * @property {string} id
 * @property {Date} created_at
 * @property {Date} [updated_at]
 * @property {string} title
 * @property {string} description
 * @property {string} image_url
 * @property {boolean} explicit
 * @property {string} token
 * @property {boolean} default_feed
 * @property {string} feed_url
 */

/**
 * @typedef {object} DeltaFeedLastUpdateRow
 * @property {Date | null} last_update
 */

/**
 * @param {{ ownerId: string }} params
 * @returns {SQL.SqlStatement}
 */
export function getDeltaFeedsQuery ({ ownerId }) {
  return SQL`
    select
      pf.id,
      pf.created_at,
      pf.updated_at,
      pf.title,
      pf.description,
      pf.image_url,
      pf.explicit,
      pf.token,
      (pf.id = u.default_podcast_feed_id) as default_feed
    from podcast_feeds pf
    join users u
    on u.id = pf.owner_id
    where pf.owner_id = ${ownerId}
    order by pf.created_at asc
  `
}

/**
 * @param {{ ownerId: string }} params
 * @returns {SQL.SqlStatement}
 */
export function getDeltaFeedsLastUpdateQuery ({ ownerId }) {
  return SQL`
    select max(updated_at) as last_update
    from podcast_feeds
    where owner_id = ${ownerId}
  `
}

/**
 * @param {{ fastify: FastifyInstance, ownerId: string, pg?: PgClient }} params
 * @returns {Promise<Date | null>}
 */
export async function getDeltaFeedsLastUpdate ({ fastify, ownerId, pg }) {
  const client = pg ?? fastify.pg
  const query = getDeltaFeedsLastUpdateQuery({ ownerId })

  /** @type {QueryResult<DeltaFeedLastUpdateRow>} */
  const results = await client.query(query)

  return results.rows[0]?.last_update ?? null
}

/**
 * @param {{ fastify: FastifyInstance, ownerId: string, pg?: PgClient }} params
 * @returns {Promise<DeltaFeedRead[]>}
 */
export async function getDeltaFeeds ({ fastify, ownerId, pg }) {
  const client = pg ?? fastify.pg
  const query = getDeltaFeedsQuery({ ownerId })

  /** @type {QueryResult<DeltaFeedRow>} */
  const results = await client.query(query)
  const transport = fastify.config.TRANSPORT
  const host = fastify.config.HOST

  return results.rows.map(feed => {
    const feedDefaultsInput = {
      id: feed.id,
      created_at: feed.created_at,
      token: feed.token,
      default_feed: feed.default_feed,
      ...(feed.updated_at ? { updated_at: feed.updated_at } : {}),
      ...(feed.title !== null ? { title: feed.title } : {}),
      ...(feed.description !== null ? { description: feed.description } : {}),
      ...(feed.image_url !== null ? { image_url: feed.image_url } : {}),
      ...(typeof feed.explicit === 'boolean' ? { explicit: feed.explicit } : {}),
    }
    const feedWithDefaults = getFeedWithDefaults({ feed: feedDefaultsInput, transport, host })

    if (!feedWithDefaults.title || !feedWithDefaults.description || !feedWithDefaults.image_url) {
      throw new Error(`Unable to derive feed defaults for ${feed.id}`)
    }

    return {
      id: feed.id,
      created_at: feed.created_at,
      ...(feed.updated_at ? { updated_at: feed.updated_at } : {}),
      title: feedWithDefaults.title,
      description: feedWithDefaults.description,
      image_url: feedWithDefaults.image_url,
      explicit: Boolean(feed.explicit),
      token: feed.token,
      default_feed: feed.default_feed,
      feed_url: getFeedUrl({
        transport,
        host,
        userId: ownerId,
        token: feed.token,
        feedId: feed.id,
      }),
    }
  })
}
