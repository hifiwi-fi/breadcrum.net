import SQL from '@nearform/sql'

export function getFeedQuery ({
  feedId,
  ownerId
}) {
  const feedQuery = SQL`
          select
            pf.id,
            pf.created_at,
            pf.updated_at,
            pf.title,
            pf.description,
            pf.image_url,
            pf.explicit,
            pf.token,
            u.username as owner_name,
            (pf.id = u.default_podcast_feed_id) as default_feed
          from podcast_feeds pf
          join users u
          on pf.owner_id = u.id
          where pf.id = ${feedId}
          and pf.owner_id = ${ownerId}
          fetch first row only;
        `

  return feedQuery
}
