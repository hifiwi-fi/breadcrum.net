/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function getOrCreateDefaultFeed ({
  client,
  userId
}) {
  const getDefaultFeed = SQL`
    SELECT default_podcast_feed_id
    FROM users
    WHERE id = ${userId};
  `

  const defaultFeedResults = await client.query(getDefaultFeed)
  let { default_podcast_feed_id } = defaultFeedResults.rows[0]

  if (!default_podcast_feed_id) {
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
  }
  return default_podcast_feed_id
}
