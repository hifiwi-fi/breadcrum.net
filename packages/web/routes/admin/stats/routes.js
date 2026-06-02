/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { loadAdminStats } from '../../api/admin/stats/get-admin-stats.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminStatsPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminStatsRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminStatsHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin stats')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const body = await reply.render(adminStatsPage, {
      ...context,
      adminStats: await loadAdminStats(fastify),
    }, adminRenderOptions(request))

    return reply.send(body)
  })
}
