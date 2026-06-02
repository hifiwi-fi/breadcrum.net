/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentRenderOptions, contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { legalMarkdownPage, legalNotFoundPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function legalRoutes (fastify) {
  fastify.get('/', contentRouteSchema(), legalRouteHandler)
  fastify.get('/*', contentRouteSchema(), legalRouteHandler)

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('fastify').FastifyReply>}
   */
  async function legalRouteHandler (request, reply) {
    const { segments, redirectPath } = contentSegmentsFromRequest(request, '/legal')
    if (redirectPath) return reply.redirect(redirectPath, 301)

    const context = await createRouteViewContext(fastify, request, {
      title: 'Legal',
    })
    const routePath = routePathFromSegments('/legal', segments)
    const page = await loadMarkdownPage({
      filePath: markdownFilePath('legal', segments),
      routePath,
      context,
    })

    if (!page) {
      reply.status(404)
      const body = await reply.render(legalNotFoundPage, {
        ...context,
        title: 'Legal not found',
        legalPage: {
          pathSegments: ['legal', ...segments],
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    const body = await reply.render(legalMarkdownPage, {
      ...context,
      title: page.title,
      description: page.description ?? context.siteDescription,
      ...(page.image ? { image: page.image } : {}),
      noindex: page.noindex,
      contentPage: page,
      legalPage: {
        pathSegments: ['legal', ...segments],
      },
    }, contentRenderOptions(request))

    return reply.send(body)
  }
}

/**
 * @returns {object}
 */
function contentRouteSchema () {
  return {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        301: {
          type: 'string',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }
}
