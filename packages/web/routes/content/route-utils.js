/**
 * @import { FastifyRequest } from 'fastify'
 * @import { AppFragmentId } from '#views/context.js'
 */

import { fragmentIdFromTarget, isHtmxRequest } from '#lib/htmx.js'

const contentTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: AppFragmentId } | undefined}
 */
export function contentRenderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, contentTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @param {string} prefix
 * @returns {{ segments: string[], redirectPath: string | null }}
 */
export function contentSegmentsFromRequest (request, prefix) {
  const url = new URL(request.url, 'https://breadcrum.invalid')

  if (!url.pathname.endsWith('/')) {
    return {
      segments: [],
      redirectPath: `${url.pathname}/${url.search}`,
    }
  }

  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
  const rawPath = decodeURIComponent(url.pathname)
  const rawRemainder = rawPath.startsWith(normalizedPrefix)
    ? rawPath.slice(normalizedPrefix.length)
    : ''
  const segments = rawRemainder
    .split('/')
    .filter(Boolean)
    .filter(segment => segment !== '.' && segment !== '..')

  return {
    segments,
    redirectPath: null,
  }
}

/**
 * @param {string} prefix
 * @param {string[]} segments
 * @returns {string}
 */
export function routePathFromSegments (prefix, segments) {
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
  return `${normalizedPrefix}${segments.length > 0 ? `${segments.join('/')}/` : ''}`
}

/**
 * @param {string[]} segments
 * @returns {string[]}
 */
export function breadcrumbSegments (segments) {
  return segments
}
