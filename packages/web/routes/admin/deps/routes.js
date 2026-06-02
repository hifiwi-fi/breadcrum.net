/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminDepsPage } from './view.js'

const execPromise = promisify(exec)

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminDepsRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminDepsHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Deps')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const body = await reply.render(adminDepsPage, {
      ...context,
      adminDeps: {
        output: await npmList(),
      },
    }, adminRenderOptions(request))

    return reply.send(body)
  })
}

/**
 * @returns {Promise<string>}
 */
async function npmList () {
  try {
    const { stdout, stderr } = await execPromise('pnpm ls')
    return stderr || stdout
  } catch (err) {
    const error = /** @type {Error} */ (err)
    return error.message
  }
}
