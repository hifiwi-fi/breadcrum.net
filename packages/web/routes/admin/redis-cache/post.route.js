import { redirectForRequest } from '#lib/htmx.js'
import { flushRedisCache } from '../../api/admin/redis/redis-actions.js'
import { adminAccessResponse, createAdminRouteContext } from '../admin-route-utils.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Redis cache')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  try {
    const result = await flushRedisCache(fastify)
    return redirectForRequest(request, reply, `/admin/redis-cache/?message=${encodeURIComponent(result.status)}`)
  } catch (err) {
    const error = /** @type {Error} */ (err)
    return redirectForRequest(request, reply, `/admin/redis-cache/?error=${encodeURIComponent(error.message)}`)
  }
}
