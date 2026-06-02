/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeBookmarkRead } from '../../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { SearchPagination } from '../../api/search/bookmarks/search-bookmarks-action.js'
 */

import html from 'fragtml'
import { bookmarkView } from '../../bookmarks/list.view.js'

/**
 * @typedef {TypeBookmarkRead & { rank: number }} BookmarkSearchResult
 */

/**
 * @typedef {object} BookmarkSearchPageState
 * @property {string} query
 * @property {BookmarkSearchResult[]} bookmarks
 * @property {SearchPagination} pagination
 * @property {string} queryString
 */

/**
 * @typedef {ViewContext & { bookmarkSearchPage: BookmarkSearchPageState }} BookmarkSearchPageContext
 */

/**
 * @type {FragtmlTemplate<BookmarkSearchPageContext, AppLayoutName, AppFragmentId>}
 */
export const bookmarkSearchPage = (context) => html/* html */`
  <div class="bc-search-page">
    <h1>Bookmark Search</h1>
    <form class="bc-search-form" method="get" action="/search/bookmarks/">
      <input
        type="search"
        name="query"
        placeholder="Search bookmarks"
        autocomplete="off"
        aria-label="Search bookmarks"
        value="${context.bookmarkSearchPage.query}"
        autofocus
      >
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${searchResourceNav(context.bookmarkSearchPage.query)}
    ${paginationControls(context)}
    <div class="${context.bookmarkSearchPage.bookmarks.length === 0 ? 'bc-search-results bc-search-results-empty' : 'bc-search-results'}">
      ${context.bookmarkSearchPage.bookmarks.length > 0
        ? context.bookmarkSearchPage.bookmarks.map(bookmark => html/* html */`
          <div class="bc-bookmark">
            ${bookmarkView(bookmark, { redirectPath: context.currentPath })}
          </div>
        `)
        : html/* html */`
          <div class="bc-search-empty">
            ${context.bookmarkSearchPage.query ? 'No bookmarks found.' : 'Search for bookmarks.'}
          </div>
        `}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @param {string} query
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function searchResourceNav (query) {
  const suffix = query ? `?query=${encodeURIComponent(query)}` : ''

  return html/* html */`
    <nav class="bc-search-resource-nav" aria-label="Search categories">
      <a aria-current="page" href="/search/bookmarks/${suffix}">Bookmarks</a>
      <a href="/search/archives/${suffix}">Archives</a>
      <a href="/search/episodes/${suffix}">Episodes</a>
    </nav>
  `
}

/**
 * @param {BookmarkSearchPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.bookmarkSearchPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Bookmark search pagination">
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
 * @param {BookmarkSearchPageContext} context
 * @param {import('../../api/search/bookmarks/search-bookmarks-action.js').SearchPageCursor} cursor
 * @returns {string}
 */
function searchUrl (context, cursor) {
  const params = new URLSearchParams(context.bookmarkSearchPage.queryString)
  params.set('query', cursor.query)
  params.set('rank', cursor.rank)
  params.set('id', cursor.id)
  params.set('reverse', String(cursor.reverse))

  return `/search/bookmarks/?${params.toString()}`
}
