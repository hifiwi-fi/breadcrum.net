/**
 * @import { FastifyRequest } from 'fastify'
 * @import { EpisodeFilters } from './episodes-page-data.js'
 */

import { fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getEpisodesPageData } from './episodes-page-data.js'
import { episodesPage } from './view.js'

const episodeTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Episodes',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const filters = episodeFilters(request)
  const pageData = await getEpisodesPageData(fastify, {
    userId: context.user.id,
    filters,
  })
  const body = await reply.render(episodesPage, {
    ...context,
    episodesPage: {
      ...pageData,
      filters,
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
    ? fragmentIdFromTarget(request, episodeTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {EpisodeFilters}
 */
function episodeFilters (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const params = url.searchParams

  return {
    before: dateCursor(params.get('before')),
    after: dateCursor(params.get('after')),
    perPage: integerParam(params.get('per_page'), 20, 1, 200),
    sensitive: booleanParam(params.get('sensitive')),
    bookmarkId: stringParam(params.get('bookmark_id') || params.get('bid'), 255),
    feedId: stringParam(params.get('feed_id'), 255),
    defaultFeed: booleanParam(params.get('default_feed')),
    ready: nullableBooleanParam(params.get('ready')),
    queryString: params.toString(),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/episodes/'))
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

/**
 * @param {string | null} value
 * @returns {boolean | null}
 */
function nullableBooleanParam (value) {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}
