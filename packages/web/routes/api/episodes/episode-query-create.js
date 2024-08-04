/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 */

import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from '../feeds/default-feed/default-feed-query.js'

/**
 * Creates an episode entry in the database.
 *
 * This function first retrieves or creates a default feed for the given user. Then, it inserts a new episode
 * into the `episodes` table with the provided details and returns the newly created episode object.
 *
 * @param {object} params - The parameters for creating an episode.
 * @param {PoolClient | FastifyInstance['pg']} params.client - The database client for executing queries, an instance of a pg connection from `fastify.pg` or `node-pg`.
 * @param {string} params.userId - The ID of the user who owns the episode.
 * @param {string} params.bookmarkId - The ID of the bookmark associated with the episode.
 * @param {string} params.type - The type of the episode.
 * @param {string} params.medium - The medium of the episode (e.g., audio, video).
 * @param {string} params.url - The URL of the episode.
 * @returns {Promise<{
 *   id: string,
 *   type: string,
 *   medium: string,
 *   podcast_feed_id: string,
 *   url: string
 * }>} A promise that resolves to the newly created episode object, including its ID, type, medium, podcast feed ID, and URL.
 */
export async function createEpisode ({
  client,
  userId,
  bookmarkId,
  type,
  medium,
  url,
}) {
  const defaultFeedId = await getOrCreateDefaultFeed({ client, userId })

  const createEpisodeQuery = SQL`
          INSERT INTO episodes (owner_id, podcast_feed_id, bookmark_id, type, medium, url)
          VALUES (${userId}, ${defaultFeedId}, ${bookmarkId}, ${type}, ${medium}, ${url})
          returning id, type, medium, podcast_feed_id, url;
          `

  const episodeResults = await client.query(createEpisodeQuery)
  const episode = episodeResults.rows[0]
  return episode
}
