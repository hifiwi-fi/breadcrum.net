import jsonfeedToRSS from 'jsonfeed-to-rss'
import cleanDeep from 'clean-deep'
import { getFeedQuery } from './feed-query.js'
import { getEpisodesQuery } from '../../episodes/episode-query-get.js'
import { getFeedUrl, getFeedHtmlUrl, getFeedImageUrl } from '../feed-urls.js'
import { getFeedTitle, getFeedDescription } from '../feed-defaults.js'
import { getBookmarksUrl } from '../../bookmarks/bookmarks-urls.js'
import { getBookmarkUrl } from '../../bookmarks/_id/bookmark-urls.js'
import { getEpisodeUrl } from './episode/_episode/episode-urls.js'

export async function getFeed (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.basicAuth,
      ], {
        relation: 'or',
      }),
      schema: {
        tags: ['feeds'],
        parms: {
          type: 'object',
          properties: {
            feed: {
              type: 'string',
              format: 'uuid',
            },
          },
          required: ['feed'],
        },
        querystring: {
          type: 'object',
          properties: {
            format: {
              enum: ['json', 'rss'],
            },
          },
        },
      },
    },
    async function getFeedHandler (request, reply) {
      // const { userId, token: userProvidedToken } = request.feedTokenUser
      const feedTokenUser = request.feedTokenUser
      const userId = feedTokenUser?.userId ?? request?.user?.id
      if (!userId) return reply.unauthorized('Missing authenticated feed userId')

      const { feed: feedId } = request.params
      const { format } = request.query
      const accept = request.accepts()

      const episodesQuery = getEpisodesQuery({
        ownerId: userId,
        feedId,
        sensitive: true,
        ready: true,
        perPage: 100,
      })

      const feedQuery = getFeedQuery({ feedId, ownerId: userId })

      const [episodesResults, feedResults] = await Promise.all([
        fastify.pg.query(episodesQuery),
        fastify.pg.query(feedQuery),
      ])

      const pf = feedResults.rows.pop()
      if (!pf) {
        return reply.notFound(`podcast feed ${feedId} not found`)
      }

      // Default to the token the user passes
      // If for some reason they were able to bypass auth with a bad token, don't
      // hand out good tokens.
      const token = feedTokenUser?.token ?? pf.token

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
        feed_url: getFeedUrl({ transport, host, userId, token, feedId: pf.id }),
        author: {
          name: pf.username,
          url: getBookmarksUrl({ transport, host }),
          avatar: getFeedImageUrl({ transport, host, imageUrl: pf.image_url }),
        },
        _itunes: {
          explicit: pf.explicit,
          block: true,
        },
        _breadcrum: {
          default_feed: pf.default_feed,
        },
        items: episodes.length > 0
          ? episodes.map(ep => {
            return {
              id: ep.id,
              url: getBookmarkUrl({ transport, host, bookmarkId: ep.bookmark.id }),
              title: ep.display_title,
              content_text: ep.text_content ?? ep.bookmark.note,
              date_published: ep.created_at,
              image: ep.thumbnail,
              attachments: cleanDeep([{
                url: getEpisodeUrl({ transport, host, userId, token, feedId: pf.id, episodeId: ep.id }),
                mime_type: `${ep.src_type}/${ep.ext === 'm4a' ? 'mp4' : ep.ext === 'mp3' ? 'mpeg' : ep.ext}`, // TODO: remove this hack
                title: ep.filename,
                duration_in_seconds: ep.duration_in_seconds,
              }]),
            }
          })
          : [{ // Placeholder show so people can subscribe to empty feeds.
              id: `breadcrum.net:episode:placeholder:${feedId}:${userId}`,
              url: `${transport}://${host}/bookmarks`,
              title: 'Breadcum.net placeholder episode',
              content_text: 'This episode will disapear when you create your first breadcrum episode. Its added so that you can subscribe to your podcast feed URL before you add any episodes.',
              date_published: new Date('2022-09-24T19:30:24.654Z'),
              attachments: cleanDeep([{
                url: getEpisodeUrl({ transport, host, userId, token, feedId: pf.id, episodeId: 'placeholder' }),
                mime_type: 'video/mp4',
                title: 'never-gonna-give-you-up.mp4',
                duration_in_seconds: 212,
              }]),
            }],
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

      // Different defaults for when the qs is not defined
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
