/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { getAdminUser } from '../../../api/admin/users/get-admin-users-query.js'
import { adminAccessResponse, adminRenderOptions, createAdminRouteContext } from '../../admin-route-utils.js'
import { adminUsersPage } from '../view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function adminUserViewRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
    },
  }, async function getAdminUserViewHandler (request, reply) {
    const context = await createAdminRouteContext(fastify, request, 'Admin user')
    const accessResponse = adminAccessResponse(request, reply, context)
    if (accessResponse) return accessResponse

    const url = new URL(request.url, 'https://breadcrum.invalid')
    const id = url.searchParams.get('id')
    if (!id) {
      return reply.redirect('/admin/users/')
    }

    const user = await getAdminUser({
      fastify,
      userId: id,
    })

    if (!user) {
      return reply.notFound('User not found')
    }

    const geoipLookup = fastify.geoip?.lookup
    const body = await reply.render(adminUsersPage, {
      ...context,
      adminUsers: {
        users: [{
          ...user,
          geoip: geoipLookup && user.ip ? geoipLookup(user.ip) : null,
          registration_geoip: geoipLookup && user.registration_ip ? geoipLookup(user.registration_ip) : null,
        }],
        pagination: null,
        queryString: url.searchParams.toString(),
        message: stringParam(url.searchParams.get('message'), 400),
        error: stringParam(url.searchParams.get('error'), 400),
        single: true,
      },
    }, adminRenderOptions(request))

    return reply.send(body)
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
