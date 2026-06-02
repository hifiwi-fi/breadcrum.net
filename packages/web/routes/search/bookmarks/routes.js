/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { BookmarkSearchPageState } from './view.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { searchBookmarks } from '../../api/search/bookmarks/search-bookmarks-action.js'
import { booleanParam, clampInteger } from '../search-route-utils.js'
import { bookmarkSearchPage } from './view.js'

const bookmarkSearchTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkSearchRoutes (fastify) {
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
  }, async function getBookmarkSearchHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Bookmark Search',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const page = await bookmarkSearchPageState(fastify, context.user.id, request)
    const body = await reply.render(bookmarkSearchPage, {
      ...context,
      title: page.query ? `${page.query} | Bookmark Search` : 'Bookmark Search',
      bookmarkSearchPage: page,
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} userId
 * @param {FastifyRequest} request
 * @returns {Promise<BookmarkSearchPageState>}
 */
async function bookmarkSearchPageState (fastify, userId, request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const query = url.searchParams.get('query')?.trim() ?? ''
  const perPage = clampInteger(url.searchParams.get('per_page'), 20, 1, 50)

  if (!query) {
    return {
      query,
      bookmarks: [],
      pagination: {
        top: true,
        bottom: true,
      },
      queryString: url.searchParams.toString(),
    }
  }

  const result = await searchBookmarks(fastify, {
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
    bookmarks: result.data,
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
    ? fragmentIdFromTarget(request, bookmarkSearchTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/search/bookmarks/'))
  return `/login/?redirect=${redirect}`
}
