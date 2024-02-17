import SQL from '@nearform/sql'

export function getFeedsQuery ({
  userId
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
