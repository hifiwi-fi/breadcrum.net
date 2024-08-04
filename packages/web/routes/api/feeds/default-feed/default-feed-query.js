/* eslint-disable camelcase */
/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 */

import SQL from '@nearform/sql'

/**
 * Retrieves or creates a default podcast feed for a given user.
 *
 * This function first attempts to retrieve the user's default podcast feed ID from the database.
 * If the user does not have a default podcast feed, the function creates a new podcast feed,
 * assigns it as the user's default, and returns the new feed's ID.
 *
 * The process of creating a new feed and updating the user's default feed ID is performed
 * within a database transaction to ensure data consistency.
 *
 * @param {Object} params - The function parameters.
 * @param {PoolClient | FastifyInstance['pg']} params.client - The database client for executing queries, an instance of a pg connection from `fastify.pg` or `node-pg`.
 * @param {string} params.userId - The ID of the user for whom to retrieve or create the default podcast feed.
 * @returns {Promise<string>} The ID of the default podcast feed for the given user.
 * @throws {Error} Throws an error if the database transaction fails.
 */
export async function getOrCreateDefaultFeed ({
  client,
  userId,
}) {
  const getDefaultFeed = SQL`
    SELECT default_podcast_feed_id
    FROM users
    WHERE id = ${userId};
  `

  const defaultFeedResults = await client.query(getDefaultFeed)
  let { default_podcast_feed_id } = defaultFeedResults.rows[0]

  if (!default_podcast_feed_id) {
    try {
      await client.query(SQL`BEGIN`)
      const createDefaultFeed = SQL`
      INSERT INTO podcast_feeds (owner_id)
      VALUES (${userId})
      returning id;
      `

      const defaultFeedResults = await client.query(createDefaultFeed)

      default_podcast_feed_id = defaultFeedResults.rows[0].id

      const applyDefaultFeed = SQL`
      update users
      set default_podcast_feed_id = ${default_podcast_feed_id}
      where id = ${userId};
      `

      await client.query(applyDefaultFeed)
      await client.query(SQL`COMMIT`)
    } catch (err) {
      await client.query(SQL`ROLLBACK`)
      throw err
    }
  }

  return default_podcast_feed_id
}
