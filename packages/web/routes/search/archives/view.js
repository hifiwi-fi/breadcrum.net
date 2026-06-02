/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeArchiveRead } from '../../api/archives/schemas/schema-archive-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { SearchPagination } from '../../api/search/archives/search-archives-action.js'
 */

import html from 'fragtml'

/**
 * @typedef {TypeArchiveRead & { rank: number }} ArchiveSearchResult
 */

/**
 * @typedef {object} ArchiveSearchPageState
 * @property {string} query
 * @property {ArchiveSearchResult[]} archives
 * @property {SearchPagination} pagination
 * @property {string} queryString
 */

/**
 * @typedef {ViewContext & { archiveSearchPage: ArchiveSearchPageState }} ArchiveSearchPageContext
 */

/**
 * @type {FragtmlTemplate<ArchiveSearchPageContext, AppLayoutName, AppFragmentId>}
 */
export const archiveSearchPage = (context) => html/* html */`
  <div class="bc-search-page">
    <h1>Archive Search</h1>
    <form class="bc-search-form" method="get" action="/search/archives/">
      <input type="search" name="query" placeholder="Search archives" autocomplete="off" aria-label="Search archives" value="${context.archiveSearchPage.query}" autofocus>
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${searchResourceNav(context.archiveSearchPage.query)}
    ${paginationControls(context)}
    <div class="${context.archiveSearchPage.archives.length === 0 ? 'bc-search-results bc-search-results-empty' : 'bc-search-results'}">
      ${context.archiveSearchPage.archives.length > 0
        ? context.archiveSearchPage.archives.map(archive => archiveResult(archive))
        : html`<div class="bc-search-empty">${context.archiveSearchPage.query ? 'No archives found.' : 'Search for archives.'}</div>`}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @param {ArchiveSearchResult} archive
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function archiveResult (archive) {
  const createdAt = toDate(archive.created_at)
  const title = archive.display_title || archive.title || archive.bookmark?.title || archive.url

  return html/* html */`
    <article class="bc-search-result bc-archive-search-result">
      <h2><a href="/archives/view/?id=${archive.id}">${title}</a></h2>
      <div class="bc-bookmark-url-display"><a href="${archive.url}" rel="noreferrer">${displayUrl(archive.url)}</a></div>
      ${archive.excerpt ? html`<p>${archive.excerpt}</p>` : null}
      ${archive.bookmark ? html`<div class="bc-date"><a href="/bookmarks/view/?id=${archive.bookmark.id}">Bookmark</a></div>` : null}
      ${createdAt ? html`<div class="bc-date"><time datetime="${createdAt.toISOString()}">${createdAt.toLocaleString()}</time></div>` : null}
    </article>
  `
}

/**
 * @param {string} query
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function searchResourceNav (query) {
  const suffix = query ? `?query=${encodeURIComponent(query)}` : ''

  return html/* html */`
    <nav class="bc-search-resource-nav" aria-label="Search categories">
      <a href="/search/bookmarks/${suffix}">Bookmarks</a>
      <a aria-current="page" href="/search/archives/${suffix}">Archives</a>
      <a href="/search/episodes/${suffix}">Episodes</a>
    </nav>
  `
}

/**
 * @param {ArchiveSearchPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.archiveSearchPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Archive search pagination">
      <div class="pagination-buttons-nav">
        ${pagination.prev
          ? html`<a class="pagination-button" href="${searchUrl(context, pagination.prev)}">prev</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">prev</span>`}
        ${pagination.next
          ? html`<a class="pagination-button" href="${searchUrl(context, pagination.next)}">next</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">next</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {ArchiveSearchPageContext} context
 * @param {import('../../api/search/archives/search-archives-action.js').SearchPageCursor} cursor
 * @returns {string}
 */
function searchUrl (context, cursor) {
  const params = new URLSearchParams(context.archiveSearchPage.queryString)
  params.set('query', cursor.query)
  params.set('rank', cursor.rank)
  params.set('id', cursor.id)
  params.set('reverse', String(cursor.reverse))

  return `/search/archives/?${params.toString()}`
}

/**
 * @param {Date | string} value
 * @returns {Date | null}
 */
function toDate (value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

/**
 * @param {string} url
 * @returns {string}
 */
function displayUrl (url) {
  return url.replace(/^https?:\/\//, '')
}
