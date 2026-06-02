/**
 * @import { FastifyPluginAsync } from 'fastify'
 */

import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentRenderOptions, contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { loadBlogPosts, loadBlogYears } from './blog-posts.js'
import { blogIndexPage, blogArticlePage, blogNotFoundPage, blogYearPage } from './view.js'

/**
 * @type {FastifyPluginAsync}
 */
export default async function blogRoutes (fastify) {
  fastify.get('/', contentRouteSchema(), blogRouteHandler)
  fastify.get('/*', contentRouteSchema(), blogRouteHandler)

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   * @returns {Promise<import('fastify').FastifyReply>}
   */
  async function blogRouteHandler (request, reply) {
    const { segments, redirectPath } = contentSegmentsFromRequest(request, '/blog')
    if (redirectPath) return reply.redirect(redirectPath, 301)

    const context = await createRouteViewContext(fastify, request, {
      title: 'Blog',
    })
    const posts = await loadBlogPosts()
    const years = await loadBlogYears()

    if (segments.length === 0) {
      const body = await reply.render(blogIndexPage, {
        ...context,
        title: 'Breadcrum.net Blog',
        noindex: true,
        blogPage: {
          pathSegments: ['blog'],
          posts: posts.slice(0, 50),
          years,
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    if (segments.length === 1 && /^\d{4}$/.test(segments[0] ?? '')) {
      const year = segments[0] ?? ''
      const body = await reply.render(blogYearPage, {
        ...context,
        title: `All ${year} Blog Posts`,
        noindex: true,
        blogPage: {
          pathSegments: ['blog', year],
          posts: posts.filter(post => post.year === year),
          years,
          year,
        },
      }, contentRenderOptions(request))
      return reply.send(body)
    }

    if (segments.length === 2 && /^\d{4}$/.test(segments[0] ?? '')) {
      const page = await loadMarkdownPage({
        filePath: markdownFilePath('blog', segments),
        routePath: routePathFromSegments('/blog', segments),
        context,
      })

      if (page) {
        const body = await reply.render(blogArticlePage, {
          ...context,
          title: page.title,
          description: page.description ?? context.siteDescription,
          ...(page.image ? { image: page.image } : {}),
          noindex: page.noindex,
          contentPage: page,
          blogPage: {
            pathSegments: ['blog', ...segments],
          },
        }, contentRenderOptions(request))
        return reply.send(body)
      }
    }

    reply.status(404)
    const body = await reply.render(blogNotFoundPage, {
      ...context,
      title: 'Blog post not found',
      blogPage: {
        pathSegments: ['blog', ...segments],
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
