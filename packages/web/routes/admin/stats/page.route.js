import { loadAdminStats } from '../../api/admin/stats/get-admin-stats.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminStatsPage } from './view.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Admin stats')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  const body = await reply.render(adminStatsPage, {
    ...context,
    adminStats: await loadAdminStats(fastify),
  }, adminRenderOptions(request))

  return reply.send(body)
}
