/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { flushRedisCache } from '../../api/admin/redis/redis-actions.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminRedisCachePage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminRedisCacheRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminRedisCacheHandler (request, reply) {
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
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
    },
  }, async function postAdminRedisCacheHandler (request, reply) {
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
  })
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
