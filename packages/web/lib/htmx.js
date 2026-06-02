/**
 * @import { FastifyReply, FastifyRequest } from 'fastify'
 */

/**
 * @typedef {object} HtmxContext
 * @property {boolean} isHtmx
 * @property {string | null} target
 * @property {string | null} requestType
 */

/**
 * @typedef {object} FormError
 * @property {string | null} field
 * @property {string} message
 */

/**
 * @param {FastifyRequest} request
 * @returns {boolean}
 */
export function isHtmxRequest (request) {
  return request.headers['hx-request'] === 'true'
}

/**
 * @param {FastifyRequest} request
 * @returns {HtmxContext}
 */
export function getHtmxContext (request) {
  return {
    isHtmx: isHtmxRequest(request),
    target: headerValue(request.headers['hx-target']),
    requestType: headerValue(request.headers['hx-request-type']),
  }
}

/**
 * @template {string} FragmentId
 * @param {FastifyRequest} request
 * @param {Readonly<Record<string, FragmentId>>} targetFragments
 * @param {FragmentId | null} [fallback]
 * @returns {FragmentId | null}
 */
export function fragmentIdFromTarget (request, targetFragments, fallback = null) {
  const target = headerValue(request.headers['hx-target'])
  if (!target) return fallback
  return targetFragments[target] ?? fallback
}

/**
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {FastifyReply}
 */
export function redirectForRequest (request, reply, url) {
  if (isHtmxRequest(request)) {
    reply.header('HX-Redirect', url)
    reply.status(204)
    return reply
  }

  return reply.redirect(url)
}

/**
 * Converts a user-provided redirect target into a same-site path.
 *
 * @param {string | null | undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function safeRedirectPath (value, fallback) {
  if (!value) return fallback

  try {
    const url = new URL(value, 'https://breadcrum.invalid')
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

/**
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {FastifyReply}
 */
export function setHtmxLocation (reply, url) {
  reply.header('HX-Location', url)
  return reply
}

/**
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {FastifyReply}
 */
export function setHtmxPushUrl (reply, url) {
  reply.header('HX-Push-Url', url)
  return reply
}

/**
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {FastifyReply}
 */
export function setHtmxReplaceUrl (reply, url) {
  reply.header('HX-Replace-Url', url)
  return reply
}

/**
 * @param {string} message
 * @param {string | null} [field]
 * @returns {FormError}
 */
export function formError (message, field = null) {
  return { field, message }
}

/**
 * @param {string | Error | FormError | Array<string | Error | FormError>} errors
 * @returns {FormError[]}
 */
export function normalizeFormErrors (errors) {
  const values = Array.isArray(errors) ? errors : [errors]

  return values.map(error => {
    if (typeof error === 'string') return formError(error)
    if (error instanceof Error) return formError(error.message)
    return error
  })
}

/**
 * @param {string | string[] | undefined} value
 * @returns {string | null}
 */
function headerValue (value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
