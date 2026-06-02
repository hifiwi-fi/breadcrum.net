/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { EpisodeSearchPageState } from './view.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { searchEpisodes } from '../../api/search/episodes/search-episodes-action.js'
import { booleanParam, clampInteger } from '../search-route-utils.js'
import { episodeSearchPage } from './view.js'

const episodeSearchTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function episodeSearchRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getEpisodeSearchHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Episode Search',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const page = await episodeSearchPageState(fastify, context.user.id, request)
    const body = await reply.render(episodeSearchPage, {
      ...context,
      title: page.query ? `${page.query} | Episode Search` : 'Episode Search',
      episodeSearchPage: page,
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} userId
 * @param {FastifyRequest} request
 * @returns {Promise<EpisodeSearchPageState>}
 */
async function episodeSearchPageState (fastify, userId, request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const query = url.searchParams.get('query')?.trim() ?? ''
  const perPage = clampInteger(url.searchParams.get('per_page'), 20, 1, 50)

  if (!query) {
    return {
      query,
      episodes: [],
      pagination: {
        top: true,
        bottom: true,
      },
      queryString: url.searchParams.toString(),
    }
  }

  const result = await searchEpisodes(fastify, {
    userId,
    query,
    perPage,
    sensitive: booleanParam(url.searchParams.get('sensitive')),
    starred: booleanParam(url.searchParams.get('starred')),
    toread: booleanParam(url.searchParams.get('toread')),
    rank: numberParam(url.searchParams.get('rank')),
    id: url.searchParams.get('id') ?? undefined,
    reverse: booleanParam(url.searchParams.get('reverse')),
  })

  return {
    query,
    episodes: result.data,
    pagination: result.pagination,
    queryString: url.searchParams.toString(),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, episodeSearchTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/search/episodes/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {string | null} value
 * @returns {number | undefined}
 */
function numberParam (value) {
  if (!value) return undefined
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : undefined
}
