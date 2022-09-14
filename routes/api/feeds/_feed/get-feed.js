import jsonfeedToRSS from 'jsonfeed-to-rss'
import cleanDeep from 'clean-deep'
import { getFeedQuery } from './feed-query.js'
import { getEpisodesQuery } from '../../episodes/episode-query.js'
import { getFeedUrl, getFeedHtmlUrl, getFeedImageUrl } from '../feed-urls.js'
import { getFeedTitle, getFeedDescription } from '../feed-defaults.js'
import { getBookmarksUrl } from '../../bookmarks/bookmarks-urls.js'
import { getBookmarkUrl } from '../../bookmarks/_id/bookmark-urls.js'
import { getEpisodeUrl } from './episode/_episode/episode-urls.js'

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

      const episodesQuery = getEpisodesQuery({
        ownerId: userId,
        feedId,
        perPage: 100
      })

      const feedQuery = getFeedQuery({ feedId, ownerId: userId })

      const [episodesResults, feedResults] = await Promise.all([
        fastify.pg.query(episodesQuery),
        fastify.pg.query(feedQuery)
      ])

      const pf = feedResults.rows.pop()
      if (!pf) {
        return reply.notFound(`podcast feed ${feedId} not found`)
      }

      const episodes = episodesResults.rows

      const transport = fastify.config.TRANSPORT
      const host = fastify.config.HOST

      const jsonfeed = {
        version: 'https://jsonfeed.org/version/1',
        title: getFeedTitle({ title: pf.title, ownerName: pf.owner_name }),
        home_page_url: getFeedHtmlUrl({ transport, host, feedId }),
        description: getFeedDescription({ description: pf.description, ownerName: pf.owner_name, defaultFeed: pf.default_feed }),
        icon: getFeedImageUrl({ transport, host, imageUrl: pf.image_url }),
        favicon: getFeedImageUrl({ transport, host, imageUrl: pf.image_url }),
        feed_url: getFeedUrl({ transport, host, userId, token: pf.token, feedId: pf.id }),
        author: {
          name: pf.username,
          url: getBookmarksUrl({ transport, host }),
          avatar: getFeedImageUrl({ transport, host, imageUrl: pf.image_url })
        },
        _itunes: {
          explicit: pf.explicit
        },
        _breadcrum: {
          default_feed: pf.default_feed
        },
        items: episodes.map(ep => {
          return {
            id: ep.id,
            url: getBookmarkUrl({ transport, host, bookmarkId: ep.bookmark.id }),
            title: ep.display_title,
            content_text: ep.bookmark.note,
            date_published: ep.created_at,
            attachments: cleanDeep([{
              url: getEpisodeUrl({ transport, host, userId, userProvidedToken, feedId: pf.id, episodeId: ep.id }),
              mime_type: `${ep.src_type}/${ep.ext}`,
              title: ep.filename,
              duration_in_seconds: ep.duration_in_seconds
            }])
          }
        })
      }

      // Querystring overrides accept header
      if (format) {
        switch (format) {
          case 'rss': {
            reply.type('application/rss+xml')
            const rss = getRss(jsonfeed)
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
          const rss = getRss(jsonfeed)
          return rss
        }
      }
    }
  )
}

const getRss = (jsonfeed) => jsonfeedToRSS(jsonfeed, { itunes: true })
