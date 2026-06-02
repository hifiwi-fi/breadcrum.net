/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentRenderOptions, contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { createBookmarkletDocsData } from './bookmarklet.js'
import { docsMarkdownPage, docsBookmarkletPage, docsTutorialPage, docsNotFoundPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function docsRoutes (fastify) {
  fastify.get('/', contentRouteSchema(), docsRouteHandler)
  fastify.get('/*', contentRouteSchema(), docsRouteHandler)

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('fastify').FastifyReply>}
   */
  async function docsRouteHandler (request, reply) {
    const { segments, redirectPath } = contentSegmentsFromRequest(request, '/docs')
    if (redirectPath) return reply.redirect(redirectPath, 301)

    if (segments.length === 1 && segments[0] === 'bookmarklets') {
      return reply.redirect('/docs/bookmarks/bookmarklets/', 301)
    }

    const context = await createRouteViewContext(fastify, request, {
      title: 'Docs',
    })
    const routePath = routePathFromSegments('/docs', segments)

    if (segments.length === 1 && segments[0] === 'tutorial') {
      const body = await reply.render(docsTutorialPage, {
        ...context,
        title: 'Tutorial',
        docsPage: {
          pathSegments: ['docs', ...segments],
          bookmarklet: createBookmarkletDocsData({
            transport: fastify.config.TRANSPORT,
            host: fastify.config.HOST,
          }).bookmarklet,
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    if (segments.length === 2 && segments[0] === 'bookmarks' && segments[1] === 'bookmarklets') {
      const body = await reply.render(docsBookmarkletPage, {
        ...context,
        title: 'Bookmarklets',
        docsPage: {
          pathSegments: ['docs', ...segments],
          ...createBookmarkletDocsData({
            transport: fastify.config.TRANSPORT,
            host: fastify.config.HOST,
          }),
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    const page = await loadMarkdownPage({
      filePath: markdownFilePath('docs', segments),
      routePath,
      context,
    })

    if (!page) {
      reply.status(404)
      const body = await reply.render(docsNotFoundPage, {
        ...context,
        title: 'Docs not found',
        docsPage: {
          pathSegments: ['docs', ...segments],
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    const body = await reply.render(docsMarkdownPage, {
      ...context,
      title: page.title,
      description: page.description ?? context.siteDescription,
      ...(page.image ? { image: page.image } : {}),
      noindex: page.noindex,
      contentPage: page,
      docsPage: {
        pathSegments: ['docs', ...segments],
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
