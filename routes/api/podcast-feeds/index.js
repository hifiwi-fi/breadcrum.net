import SQL from '@nearform/sql'
import jsonfeedToRSS from 'jsonfeed-to-rss'
import cleanDeep from 'clean-deep'

export default async function podcastFeedsRoutes (fastify, opts) {
  fastify.get(
    '/:feed',
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
      return fastify.pg.transact(async client => {
        const { userId } = request.feedTokenUser
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
            b.id as bookmark_id,
            b.url as bookmark_url,
            b.title,
            b.note
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
            u.username as owner_name
          from podcast_feeds pf
          join users u
          on pf.owner_id = u.id
          where pf.id = ${feedId}
          and pf.owner_id = ${userId}
          fetch first row only;
        `

        const [episodesResults, feedResults] = await Promise.all([
          client.query(episodesQuery),
          client.query(feedQuery)
        ])

        const pf = feedResults.rows.pop()
        if (!pf) {
          reply.code(404)
          return {
            status: `podcast feed ${feedId} not found`
          }
        }

        const episodes = episodesResults.rows

        const jsonfeed = {
          version: 'https://jsonfeed.org/version/1',
          title: pf.title || `${pf.owner_name}'s breadcrum feed`,
          home_page_url: `https://breadcrum.net/podcast_feeds?id=${feedId}`,
          description: pf.description || `This is ${pf.owner_name}'s default podcast feed. Customize this description on the feed's home page.`,
          icon: pf.image_url,
          favicon: pf.image_url,
          author: {
            name: pf.username,
            url: 'https://breadcrum.net/bookmarks',
            avatar: pf.image_url
          },
          _itunes: {
            explicit: pf.explicit
          },
          items: episodes.map(ep => {
            const redirectUrl = `https://${userId}:${pf.token}@breadcrum.net/api/podcast_feeds/${pf.id}/episodes/${ep.id}`

            return {
              id: ep.id,
              url: `https://breadcrum.net/bookmarks/view/?id=${ep.bookmark_id}`,
              title: ep.title,
              content_text: ep.note,
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

        switch (accept.type(['json', 'rss'])) {
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
      })
    }
  )
}
