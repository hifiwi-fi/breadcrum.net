import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from './admin-route-utils.js'
import { adminIndexPage } from './view.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Admin')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  const body = await reply.render(adminIndexPage, context, adminRenderOptions(request))
  return reply.send(body)
}
