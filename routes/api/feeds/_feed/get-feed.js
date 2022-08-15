import SQL from '@nearform/sql'
import jsonfeedToRSS from 'jsonfeed-to-rss'
import cleanDeep from 'clean-deep'

export async function getFeed (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth]),
      schema: {
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid'
            }
          },
          required: ['feed']
        },
        querystring: {
          type: 'object',
          properties: {
            format: {
              enum: ['json', 'rss']
            }
          }
        }
      }
    },
    async function getFeedHandler (request, reply) {
      const { userId, token: userProvidedToken } = request.feedTokenUser
      const { feed: feedId } = request.params
      const { format } = request.query
      const accept = request.accepts()
      if (!userId) throw new Error('missing authenticated feed userId')

      const episodesQuery = SQL`
          select
            e.id,
            e.created_at,
            e.updated_at,
            e.url as src_url,
            e.type,
            e.medium,
            e.size_in_bytes,
            e.duration_in_seconds,
            e.mime_type,
            e.explicit,
            e.author_name,
            e.filename,
            e.ext,
            e.src_type,
            e.ready,
            bm.id as bookmark_id,
            bm.url as bookmark_url,
            bm.title,
            bm.note
          from episodes e
          join bookmarks bm
          on bm.id = e.bookmark_id
          where e.owner_id = ${userId}
          and bm.owner_id = ${userId}
          and e.podcast_feed_id = ${feedId}
          and e.ready = true
          and e.error is null
          order by e.created_at desc, bm.title desc, e.filename desc
          fetch first 100 rows only;
        `

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
          and pf.owner_id = ${userId}
          fetch first row only;
        `

      const [episodesResults, feedResults] = await Promise.all([
        fastify.pg.query(episodesQuery),
        fastify.pg.query(feedQuery)
      ])

      const pf = feedResults.rows.pop()
      if (!pf) {
        return reply.notFound(`podcast feed ${feedId} not found`)
      }

      const episodes = episodesResults.rows

      const fallbackImg = `${fastify.config.TRANSPORT}://${fastify.config.HOST}/static/bread.png`

      const jsonfeed = {
        version: 'https://jsonfeed.org/version/1',
        title: pf.title || `${pf.owner_name}'s breadcrum feed`,
        home_page_url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/feeds?id=${feedId}`, // TODO a page with the feed contents
        description: pf.description ?? `This is ${pf.owner_name}'s default podcast feed. Customize this description on the feed's home page.`,
        icon: pf.image_url ?? fallbackImg,
        favicon: pf.image_url ?? fallbackImg,
        feed_url: `${fastify.config.TRANSPORT}://${userId}:${userProvidedToken}@${fastify.config.HOST}/api/feeds/${pf.id}`,
        author: {
          name: pf.username,
          url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks`,
          avatar: pf.image_url ?? fallbackImg
        },
        _itunes: {
          explicit: pf.explicit
        },
        _breadcrum: {
          default_feed: pf.default_feed
        },
        items: episodes.map(ep => {
          const redirectUrl = `${fastify.config.TRANSPORT}://${userId}:${userProvidedToken}@${fastify.config.HOST}/api/feeds/${pf.id}/episode/${ep.id}`

          return {
            id: ep.id,
            url: `${fastify.config.TRANSPORT}://${fastify.config.HOST}/bookmarks/view/?id=${ep.bookmark_id}`,
            title: ep.title,
            content_text: ep.note,
            date_published: ep.created_at,
            attachments: cleanDeep([{
              url: redirectUrl,
              mime_type: `${ep.src_type}/${ep.ext}`,
              title: ep.filename,
              duration_in_seconds: ep.duration_in_seconds
            }])
          }
        })
      }

      // TODO: caching

      // Querystring overrides accept header
      if (format) {
        switch (format) {
          case 'rss': {
            reply.type('application/rss+xml')
            const rss = jsonfeedToRSS(jsonfeed, {
              itunes: true
            })
            return rss
          }
          case 'json':
          default: {
            return jsonfeed
          }
        }
      }

      switch (accept.type(['rss', 'json'])) {
        case 'json': {
          reply.type('application/json')
          return jsonfeed
        }
        case 'rss':
        default: {
          reply.type('application/rss+xml')
          const rss = jsonfeedToRSS(jsonfeed, {
            itunes: true
          })
          return rss
        }
      }
    }
  )
}
