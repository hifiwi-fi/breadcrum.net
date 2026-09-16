import SQL from '@nearform/sql'

/**
 * Generates a SQL query to retrieve podcast feeds owned by a specific user.
 *
 * This function constructs a SQL query that selects podcast feeds along with their metadata and episode count,
 * owned by the given user. It also marks if a feed is the user's default podcast feed.
 *
 * @param {Object} params - The parameters for the query.
 * @param {string} params.userId - The ID of the user whose podcast feeds are being queried.
 * @returns {import('@nearform/sql').SqlStatement} A SQL statement object ready to be executed, which will retrieve the user's podcast feeds, their metadata, episode counts, and whether each is the default feed.
 */
export function getFeedsQuery ({
  userId,
}) {
  const query = SQL`
        select
          pf.id,
          pf.created_at,
          pf.updated_at,
          pf.title,
          pf.description,
          pf.image_url,
          pf.explicit,
          (pf.id = users.default_podcast_feed_id) as default_feed,
          count(ep.id) as episode_count
        from podcast_feeds pf
        left outer join users
        on users.default_podcast_feed_id = pf.id
        left outer join episodes ep
        on (pf.id = ep.podcast_feed_id)
        where pf.owner_id = ${userId}
        and ep.owner_id = ${userId}
        group by (
          pf.id,
          pf.created_at,
          pf.updated_at,
          pf.title,
          pf.description,
          pf.image_url,
          pf.explicit,
          default_feed
        )
        order by pf.created_at asc;
      `

  return query
}
