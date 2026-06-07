import { redirectForRequest } from '#lib/htmx.js'
import { logoutSession } from '../api/auth/session.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  await logoutSession(fastify, request, reply)
  return redirectForRequest(request, reply, '/')
}
