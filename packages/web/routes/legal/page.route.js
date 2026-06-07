/**
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { contentSegmentsFromRequest, routePathFromSegments } from '../content/route-utils.js'
import { articleHeader, breadcrumb, docsEditBlock, markdownContent } from '../content/view-components.js'

/**
 * @typedef {object} LegalPageState
 * @property {string[]} pathSegments
 * @property {boolean} notFound
 */

/**
 * @typedef {object} LegalPageData
 * @property {ViewContext} context
 * @property {RenderedMarkdownPage | null} contentPage
 * @property {LegalPageState} legalPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<LegalPageData | undefined>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('Legal page requires a Fastify request')

  const { segments, redirectPath } = contentSegmentsFromRequest(request, '/legal')
  if (redirectPath) {
    reply.redirect(redirectPath, 301)
    return
  }

  const context = await createRouteViewContext(request.server, request, {
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
    return {
      context: {
        ...context,
        title: 'Legal not found',
      },
      contentPage: null,
      legalPage: {
        pathSegments: ['legal', ...segments],
        notFound: true,
      },
    }
  }

  return {
    context: {
      ...context,
      title: page.title,
      description: page.description ?? context.siteDescription,
      ...(page.image ? { image: page.image } : {}),
      noindex: page.noindex,
    },
    contentPage: page,
    legalPage: {
      pathSegments: ['legal', ...segments],
      notFound: false,
    },
  }
}

/**
 * @param {{ data: LegalPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function legalPage ({ data }) {
  if (data.legalPage.notFound || !data.contentPage) {
    return html/* html */`
      <div class="bc-content-page bc-docs-page bc-legal-page">
        ${breadcrumb(data.legalPage.pathSegments)}
        <article>
          <h1>Legal page not found</h1>
          <p>The requested legal page could not be found.</p>
        </article>
      </div>
    `
  }

  return html/* html */`
    <div class="bc-content-page bc-docs-page bc-legal-page">
      ${breadcrumb(data.legalPage.pathSegments)}
      <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
        ${articleHeader({
          title: data.contentPage.title,
          publishDate: data.contentPage.publishDate,
          updatedDate: data.contentPage.updatedDate,
          extra: docsEditBlock(data.contentPage),
        })}
        ${markdownContent(data.contentPage, 'bc-docs-main bc-content-body')}
        <footer>
          ${docsEditBlock(data.contentPage)}
        </footer>
      </article>
      ${breadcrumb(data.legalPage.pathSegments)}
    </div>
  `
}

/**
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function routeOptions (options) {
  return {
    ...options,
    schema: contentRouteSchema(),
  }
}

/**
 * @returns {object}
 */
function contentRouteSchema () {
  return {
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
  }
}
