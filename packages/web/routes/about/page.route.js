/**
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { loadMarkdownPage, markdownFilePath } from '../content/markdown.js'
import { markdownContent } from '../content/view-components.js'

/**
 * @typedef {object} AboutPageData
 * @property {ViewContext} context
 * @property {RenderedMarkdownPage | null} contentPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<AboutPageData>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('About page requires a Fastify request')

  const context = await createRouteViewContext(request.server, request, {
    title: 'About',
  })
  const page = await loadMarkdownPage({
    filePath: markdownFilePath('about', []),
    routePath: '/about/',
    context,
  })

  if (!page) {
    reply.status(404)
    return {
      context: {
        ...context,
        title: 'Not found',
      },
      contentPage: null,
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
  }
}

/**
 * @param {{ data: AboutPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function aboutPage ({ data }) {
  if (!data.contentPage) {
    return html/* html */`
      <article class="bc-content-page">
        <h1>Not found</h1>
        <p>The requested page could not be found.</p>
      </article>
    `
  }

  return html/* html */`
    <article class="bc-content-page bc-content-page-about">
      ${markdownContent(data.contentPage)}
    </article>
  `
}
