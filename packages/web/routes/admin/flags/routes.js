/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { redirectForRequest } from '#lib/htmx.js'
import { defaultAdminFlags, getAdminFlagValues, updateAdminFlagValues } from '../../api/admin/flags/flag-actions.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../admin-route-utils.js'
import { adminFlagsPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminFlagsRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminFlagsHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin flags')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const url = new URL(request.url, 'https://breadcrum.invalid')
    const body = await reply.render(adminFlagsPage, {
      ...context,
      adminFlags: {
        definitions: defaultAdminFlags,
        values: await getAdminFlagValues(fastify),
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
  }, async function postAdminFlagsHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin flags')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const fields = request.body && typeof request.body === 'object'
      ? /** @type {Record<string, unknown>} */ (request.body)
      : {}
    const result = await updateAdminFlagValues(fastify, fields)
    return redirectForRequest(request, reply, `/admin/flags/?message=${encodeURIComponent(`Flags saved (${result.updateCount} updated, ${result.deleteCount} reset).`)}`)
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
