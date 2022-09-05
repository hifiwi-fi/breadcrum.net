/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { getOrCreateDefaultFeed } from '../feeds/default-feed/default-feed-query.js'

export async function createEpisode ({
  client,
  userId,
  bookmarkId,
  type,
  medium
}) {
  const defaultFeedId = await getOrCreateDefaultFeed({ client, userId })

  const createEpisodeQuery = SQL`
          INSERT INTO episodes (owner_id, podcast_feed_id, bookmark_id, type, medium)
          VALUES (${userId}, ${defaultFeedId}, ${bookmarkId}, ${type}, ${medium})
          returning id;
          `

  const episodeResults = await client.query(createEpisodeQuery)
  const episode = episodeResults.rows[0]
  return episode
}
