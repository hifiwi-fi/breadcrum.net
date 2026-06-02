/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { createRouteViewContext } from '#views/context.js'
import { contentRenderOptions } from '../content/route-utils.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { aboutPage, contentNotFoundPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function aboutRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function aboutRouteHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'About',
    })
    const page = await loadMarkdownPage({
      filePath: markdownFilePath('about', []),
      routePath: '/about/',
      context,
    })

    if (!page) {
      reply.status(404)
      const body = await reply.render(contentNotFoundPage, {
        ...context,
        title: 'Not found',
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    const body = await reply.render(aboutPage, {
      ...context,
      title: page.title,
      description: page.description ?? context.siteDescription,
      ...(page.image ? { image: page.image } : {}),
      noindex: page.noindex,
      contentPage: page,
    }, contentRenderOptions(request))

    return reply.send(body)
  })
}
