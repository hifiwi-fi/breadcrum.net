/**
 * @import { FastifyRequest } from 'fastify'
 * @import { TypeEpisodeRead } from '../../api/episodes/schemas/schema-episode-read.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getEpisode } from '../../api/episodes/episode-query-get.js'
import { getFeedWithDefaults } from '../../api/feeds/feed-defaults.js'
import { hydrateEmbed } from '../../api/episodes/hydrate-embed.js'
import { episodeArticle, episodeEditFormFromEpisode } from '../episode.view.js'
import { episodeViewPage } from './view.js'

const episodeViewTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Episode',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const url = new URL(request.url, 'https://breadcrum.invalid')
  const id = url.searchParams.get('id')
  if (!id) {
    return redirectForRequest(request, reply, '/episodes/')
  }

  const edit = url.searchParams.get('edit') === 'true'
  const episode = await getEpisodeForView(fastify, {
    userId: context.user.id,
    episodeId: id,
    sensitive: edit || url.searchParams.get('sensitive') === 'true',
  })

  if (!episode) {
    reply.status(404)
  }

  if (episode && isHtmxRequest(request) && url.searchParams.get('fragment') === 'episode') {
    const redirectPath = safeRedirectPath(
      url.searchParams.get('redirect'),
          `/episodes/view/?id=${episode.id}`
    )
    const body = await render(episodeArticle(episode, {
      fullView: true,
      showError: true,
      redirectPath,
      deleteRedirectPath: `/bookmarks/view/?id=${episode.bookmark.id}`,
    }))
    return reply.send(body)
  }

  const body = await reply.render(episodeViewPage, {
    ...context,
    title: episode?.display_title ?? episode?.title ?? 'Episode',
    episodeViewPage: {
      episode: episode ?? null,
      error: episode ? null : 'Episode not found.',
      edit,
      editForm: episode ? episodeEditFormFromEpisode(episode) : null,
    },
  }, renderOptions(request))

  return reply.send(body)
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, episodeViewTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.episodeId
 * @param {boolean} params.sensitive
 * @returns {Promise<TypeEpisodeRead | undefined>}
 */
async function getEpisodeForView (fastify, { userId, episodeId, sensitive }) {
  const episode = await getEpisode({
    fastify,
    ownerId: userId,
    episodeId,
    sensitive,
    perPage: 1,
    includeFeed: true,
  })

  if (!episode) return undefined

  episode.podcast_feed = getFeedWithDefaults({
    feed: episode.podcast_feed,
    transport: fastify.config.TRANSPORT,
    host: fastify.config.HOST,
  })

  hydrateEmbed(episode)

  return episode
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/episodes/view/'))
  return `/login/?redirect=${redirect}`
}
