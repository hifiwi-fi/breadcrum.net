import { redirectForRequest } from '#lib/htmx.js'
import { updateAdminFlagValues } from '../../api/admin/flags/flag-actions.js'
import { adminAccessResponse, createAdminRouteContext } from '../admin-route-utils.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Admin flags')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  const fields = request.body && typeof request.body === 'object'
    ? /** @type {Record<string, unknown>} */ (request.body)
    : {}
  const result = await updateAdminFlagValues(fastify, fields)
  return redirectForRequest(request, reply, `/admin/flags/?message=${encodeURIComponent(`Flags saved (${result.updateCount} updated, ${result.deleteCount} reset).`)}`)
}
