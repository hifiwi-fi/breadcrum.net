import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminRedisCachePage } from './view.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Redis cache')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  const url = new URL(request.url, 'https://breadcrum.invalid')
  const body = await reply.render(adminRedisCachePage, {
    ...context,
    adminRedisCache: {
      message: stringParam(url.searchParams.get('message'), 400),
      error: stringParam(url.searchParams.get('error'), 400),
    },
  }, adminRenderOptions(request))

  return reply.send(body)
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
