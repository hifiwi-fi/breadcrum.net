/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {ViewContext & { searchPage: { query: string } }} SearchPageContext
 */

/**
 * @type {FragtmlTemplate<SearchPageContext, AppLayoutName, AppFragmentId>}
 */
export const searchPage = (context) => html/* html */`
  <div class="bc-search-page">
    <h1>Search</h1>
    <form class="bc-search-form" method="get" action="/search/bookmarks/">
      <input
        type="search"
        name="query"
        placeholder="Search bookmarks"
        autocomplete="off"
        aria-label="Search bookmarks"
        value="${context.searchPage.query}"
        autofocus
      >
      <button class="bc-button" type="submit">Search</button>
    </form>
    <nav class="bc-search-resource-nav" aria-label="Search categories">
      <a href="/search/bookmarks/${context.searchPage.query ? `?query=${encodeURIComponent(context.searchPage.query)}` : ''}">Bookmarks</a>
      <a href="/search/archives/${context.searchPage.query ? `?query=${encodeURIComponent(context.searchPage.query)}` : ''}">Archives</a>
      <a href="/search/episodes/${context.searchPage.query ? `?query=${encodeURIComponent(context.searchPage.query)}` : ''}">Episodes</a>
    </nav>
  </div>
`
