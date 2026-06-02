/**
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { RenderedMarkdownPage } from './markdown.js'
 */

import html, { raw } from 'fragtml'

/**
 * @param {string[]} pathSegments
 * @returns {HtmlRenderable}
 */
export function breadcrumb (pathSegments) {
  return html/* html */`
    <nav class="bc-breadcrumb-nav" aria-label="breadcrumb">
      <ol class="bc-breadcrumb-list">
        ${pathSegments.map((segment, index) => html/* html */`
          <li class="bc-breadcrumb-item${index === pathSegments.length - 1 ? ' bc-breadcrumb-item-active' : ''}">
            <a href="${breadcrumbHref(pathSegments, index)}">${segment}</a>
          </li>
        `)}
      </ol>
    </nav>
  `
}

/**
 * @param {object} params
 * @param {string} params.title
 * @param {string | null} [params.authorImgUrl]
 * @param {string | null} [params.authorImgAlt]
 * @param {string | null} [params.authorName]
 * @param {string | null} [params.authorUrl]
 * @param {string | null} [params.publishDate]
 * @param {string | null} [params.updatedDate]
 * @param {HtmlRenderable | null} [params.extra]
 * @returns {HtmlRenderable}
 */
export function articleHeader ({
  title,
  authorImgUrl = null,
  authorImgAlt = null,
  authorName = null,
  authorUrl = null,
  publishDate = null,
  updatedDate = null,
  extra = null,
}) {
  return html/* html */`
    <header class="bc-article-header">
      <h1 class="p-name bc-article-title" itemprop="headline">${title}</h1>
      <div class="bc-article-metadata">
        ${authorImgUrl && authorName && authorUrl
          ? html/* html */`
            <address class="bc-article-author p-author h-card" itemprop="author" itemscope itemtype="http://schema.org/Person">
              <img height="40" width="40" src="${authorImgUrl}" alt="${authorImgAlt ?? ''}" class="u-photo" itemprop="image">
              <a href="${authorUrl}" class="u-url" itemprop="url">
                <span itemprop="p-name name">${authorName}</span>
              </a>
            </address>
          `
          : null}
        ${publishDate
          ? html/* html */`
            <time class="dt-published" itemprop="datePublished" datetime="${publishDate}">
              <a href="#" class="u-url">${dateTimeText(publishDate)}</a>
            </time>
          `
          : null}
        ${updatedDate
          ? html/* html */`
            <time class="dt-updated" itemprop="dateModified" datetime="${updatedDate}">
              Updated ${dateTimeText(updatedDate)}
            </time>
          `
          : null}
      </div>
      ${extra}
    </header>
  `
}

/**
 * @param {RenderedMarkdownPage} page
 * @param {string} className
 * @returns {HtmlRenderable}
 */
export function markdownContent (page, className = 'bc-content-body') {
  return html/* html */`
    <section class="${className} e-content" itemprop="articleBody">
      ${raw(page.html)}
    </section>
  `
}

/**
 * @param {RenderedMarkdownPage} page
 * @returns {HtmlRenderable}
 */
export function docsEditBlock (page) {
  return html/* html */`
    <div class="bc-docs-edit-block">
      <span class="bc-help-text">Docs can be edited. Please suggest improvements!</span>
      <a class="bc-docs-edit-link" href="${page.editUrl}" target="_blank" rel="noreferrer">Edit this page</a>
    </div>
  `
}

/**
 * @param {string} date
 * @returns {string}
 */
export function dateText (date) {
  return new Date(date).toISOString().split('T')[0] ?? date
}

/**
 * @param {string} date
 * @returns {string}
 */
function dateTimeText (date) {
  return new Date(date).toLocaleString()
}

/**
 * @param {string[]} segments
 * @param {number} index
 * @returns {string}
 */
function breadcrumbHref (segments, index) {
  return `/${segments.slice(0, index + 1).join('/')}/`
}
