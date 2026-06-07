import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { deleteArchiveById } from '../../api/archives/archive-actions.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Delete archive',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, '/login/?redirect=%2Farchives%2F')
  }

  const fields = request.body && typeof request.body === 'object'
    ? /** @type {Record<string, unknown>} */ (request.body)
    : {}
  const archiveId = stringField(fields['id'])
  const redirectPath = safeRedirectPath(stringField(fields['redirect']), '/archives/')

  if (archiveId) {
    const result = await deleteArchiveById(fastify, {
      userId: context.user.id,
      archiveId,
    })

    if (!result.ok) {
      reply.status(404)
      return reply.type('text/html').send(result.message)
    }
  }

  if (isHtmxRequest(request)) {
    return reply.type('text/html').send('')
  }

  return redirectForRequest(request, reply, redirectPath)
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '')
  if (value == null) return ''
  return String(value)
}
