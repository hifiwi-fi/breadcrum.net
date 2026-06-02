/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { ArchiveSearchPageState } from './view.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { searchArchives } from '../../api/search/archives/search-archives-action.js'
import { booleanParam, clampInteger } from '../search-route-utils.js'
import { archiveSearchPage } from './view.js'

const archiveSearchTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function archiveSearchRoutes (fastify) {
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
  }, async function getArchiveSearchHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Archive Search',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const page = await archiveSearchPageState(fastify, context.user.id, request)
    const body = await reply.render(archiveSearchPage, {
      ...context,
      title: page.query ? `${page.query} | Archive Search` : 'Archive Search',
      archiveSearchPage: page,
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} userId
 * @param {FastifyRequest} request
 * @returns {Promise<ArchiveSearchPageState>}
 */
async function archiveSearchPageState (fastify, userId, request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const query = url.searchParams.get('query')?.trim() ?? ''
  const perPage = clampInteger(url.searchParams.get('per_page'), 20, 1, 50)

  if (!query) {
    return {
      query,
      archives: [],
      pagination: {
        top: true,
        bottom: true,
      },
      queryString: url.searchParams.toString(),
    }
  }

  const result = await searchArchives(fastify, {
    userId,
    query,
    perPage,
    sensitive: booleanParam(url.searchParams.get('sensitive')),
    starred: booleanParam(url.searchParams.get('starred')),
    toread: booleanParam(url.searchParams.get('toread')),
    rank: url.searchParams.get('rank') ?? undefined,
    id: url.searchParams.get('id') ?? undefined,
    reverse: booleanParam(url.searchParams.get('reverse')),
  })

  return {
    query,
    archives: result.data,
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
    ? fragmentIdFromTarget(request, archiveSearchTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/search/archives/'))
  return `/login/?redirect=${redirect}`
}
