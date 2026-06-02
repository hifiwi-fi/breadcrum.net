/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { RenderedMarkdownPage } from '../content/markdown.js'
 */

import html from 'fragtml'
import { articleHeader, breadcrumb, docsEditBlock, markdownContent } from '../content/view-components.js'

/**
 * @typedef {object} LegalPageState
 * @property {string[]} pathSegments
 */

/**
 * @typedef {ViewContext & { contentPage: RenderedMarkdownPage, legalPage: LegalPageState }} LegalMarkdownContext
 */

/**
 * @typedef {ViewContext & { legalPage: LegalPageState }} LegalNotFoundContext
 */

/**
 * @type {FragtmlTemplate<LegalMarkdownContext, AppLayoutName, AppFragmentId>}
 */
export const legalMarkdownPage = (context) => html/* html */`
  <div class="bc-content-page bc-docs-page bc-legal-page">
    ${breadcrumb(context.legalPage.pathSegments)}
    <article class="h-entry" itemscope itemtype="http://schema.org/TechArticle">
      ${articleHeader({
        title: context.contentPage.title,
        publishDate: context.contentPage.publishDate,
        updatedDate: context.contentPage.updatedDate,
        extra: docsEditBlock(context.contentPage),
      })}
      ${markdownContent(context.contentPage, 'bc-docs-main bc-content-body')}
      <footer>
        ${docsEditBlock(context.contentPage)}
      </footer>
    </article>
    ${breadcrumb(context.legalPage.pathSegments)}
  </div>
`

/**
 * @type {FragtmlTemplate<LegalNotFoundContext, AppLayoutName, AppFragmentId>}
 */
export const legalNotFoundPage = (context) => html/* html */`
  <div class="bc-content-page bc-docs-page bc-legal-page">
    ${breadcrumb(context.legalPage.pathSegments)}
    <article>
      <h1>Legal page not found</h1>
      <p>The requested legal page could not be found.</p>
    </article>
  </div>
`
