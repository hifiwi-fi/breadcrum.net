/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { AdminPgBossData } from './view.js'
 */

import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminPgBossPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminPgBossRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminPgBossHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'pg-boss')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const result = await loadPgBossDashboard(fastify, request)
    const body = await reply.render(adminPgBossPage, {
      ...context,
      adminPgBoss: result,
    }, adminRenderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @returns {Promise<{ data: AdminPgBossData, error: string }>}
 */
async function loadPgBossDashboard (fastify, request) {
  try {
    const [summary, states, jobs, maintenance] = await Promise.all([
      injectJson(fastify, request, '/api/admin/pgboss/summary'),
      injectJson(fastify, request, '/api/admin/pgboss/states'),
      injectJson(fastify, request, '/api/admin/pgboss/jobs?limit=50'),
      injectJson(fastify, request, '/api/admin/pgboss/maintenance'),
    ])

    return {
      data: {
        summary,
        states,
        jobs: /** @type {AdminPgBossData['jobs']} */ (jobs),
        maintenance,
      },
      error: '',
    }
  } catch (err) {
    const error = /** @type {Error} */ (err)
    return {
      data: {
        summary: {},
        states: {},
        jobs: {},
        maintenance: {},
      },
      error: error.message,
    }
  }
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {string} url
 * @returns {Promise<Record<string, any>>}
 */
async function injectJson (fastify, request, url) {
  const response = await fastify.inject({
    method: 'GET',
    url,
    headers: request.headers.cookie ? { cookie: request.headers.cookie } : {},
  })

  if (response.statusCode !== 200) {
    throw new Error(`${url}: ${response.statusCode} ${response.statusMessage}`)
  }

  return JSON.parse(response.payload)
}
