/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { BookmarkFilters } from './bookmarks-page-data.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getBookmarksPageData } from './bookmarks-page-data.js'
import { bookmarksPage } from './list.view.js'

const bookmarksTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkRoutes (fastify) {
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
  }, async function getBookmarksHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Bookmarks',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const filters = bookmarkFilters(request)
    const pageData = await getBookmarksPageData(fastify, {
      userId: context.user.id,
      filters,
    })
    const body = await reply.render(bookmarksPage, {
      ...context,
      bookmarksPage: {
        ...pageData,
        filters,
      },
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, bookmarksTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {BookmarkFilters}
 */
function bookmarkFilters (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const params = url.searchParams

  return {
    before: dateCursor(params.get('before')),
    after: dateCursor(params.get('after')),
    perPage: integerParam(params.get('per_page'), 20, 1, 200),
    tag: stringParam(params.get('tag'), 255),
    sensitive: booleanParam(params.get('sensitive')),
    starred: booleanParam(params.get('starred')),
    toread: booleanParam(params.get('toread')),
    queryString: params.toString(),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {string | null} value
 * @returns {Date | null}
 */
function dateCursor (value) {
  if (!value) return null

  const numericValue = Number(value)
  const date = Number.isFinite(numericValue) && value.trim() !== ''
    ? new Date(numericValue)
    : new Date(value)

  return Number.isNaN(date.valueOf()) ? null : date
}

/**
 * @param {string | null} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function integerParam (value, fallback, min, max) {
  if (!value) return fallback
  const number = Number.parseInt(value, 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, min), max)
}

/**
 * @param {string | null} value
 * @param {number} maxLength
 * @returns {string}
 */
function stringParam (value, maxLength) {
  if (!value) return ''
  return value.trim().slice(0, maxLength)
}

/**
 * @param {string | null} value
 * @returns {boolean}
 */
function booleanParam (value) {
  return value === 'true'
}
