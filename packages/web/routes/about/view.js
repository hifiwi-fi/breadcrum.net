/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 */

import html from 'fragtml'
import { markdownContent } from '../content/view-components.js'

/**
 * @typedef {ViewContext & { contentPage: RenderedMarkdownPage }} AboutPageContext
 */

/**
 * @type {FragtmlTemplate<AboutPageContext, AppLayoutName, AppFragmentId>}
 */
export const aboutPage = (context) => html/* html */`
  <article class="bc-content-page bc-content-page-about">
    ${markdownContent(context.contentPage)}
  </article>
`

/**
 * @type {FragtmlTemplate<ViewContext, AppLayoutName, AppFragmentId>}
 */
export const contentNotFoundPage = () => html/* html */`
  <article class="bc-content-page">
    <h1>Not found</h1>
    <p>The requested page could not be found.</p>
  </article>
`
