/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { deleteEpisodeById } from '../../api/episodes/episode-actions.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function episodeDeleteRoutes (fastify) {
  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        204: {
          type: 'null',
        },
      },
    },
  }, async function postEpisodeDeleteHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Delete episode',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, '/login/?redirect=%2Fepisodes%2F')
    }

    const fields = request.body && typeof request.body === 'object'
      ? /** @type {Record<string, unknown>} */ (request.body)
      : {}
    const episodeId = stringField(fields['id'])
    const redirectPath = safeRedirectPath(stringField(fields['redirect']), '/episodes/')

    if (episodeId) {
      await deleteEpisodeById(fastify, {
        userId: context.user.id,
        episodeId,
      })
    }

    if (isHtmxRequest(request)) {
      return reply.type('text/html').send('')
    }

    return redirectForRequest(request, reply, redirectPath)
  })
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringField (value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '')
  if (value == null) return ''
  return String(value)
}
