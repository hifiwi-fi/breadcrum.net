import { listAdminUsersForAdmin } from '../../api/admin/users/admin-user-actions.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminUsersPage } from './view.js'

/**
 * @param {import('@domstack/fastify').RouteContext | import('@domstack/fastify').RoutePageContext} ctx
 */
export default async function pageRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createAdminRouteContext(fastify, request, 'Admin users')
  const accessResponse = adminAccessResponse(request, reply, context)
  if (accessResponse) return accessResponse

  const url = new URL(request.url, 'https://breadcrum.invalid')
  const result = await listAdminUsersForAdmin({
    fastify,
    before: dateParam(url.searchParams.get('before')),
    after: dateParam(url.searchParams.get('after')),
    perPage: intParam(url.searchParams.get('per_page'), 20, 1, 200),
    username: stringParam(url.searchParams.get('username'), 50) || undefined,
  })
  const body = await reply.render(adminUsersPage, {
    ...context,
    adminUsers: {
      users: result.data,
      pagination: result.pagination,
      queryString: url.searchParams.toString(),
      message: stringParam(url.searchParams.get('message'), 400),
      error: stringParam(url.searchParams.get('error'), 400),
      single: false,
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

/**
 * @param {string | null} value
 * @returns {string | undefined}
 */
function dateParam (value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString()
}

/**
 * @param {string | null} value
 * @param {number} defaultValue
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function intParam (value, defaultValue, min, max) {
  if (!value) return defaultValue
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return defaultValue
  return Math.max(min, Math.min(parsed, max))
}
