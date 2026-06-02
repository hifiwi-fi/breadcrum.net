/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeEpisodeRead } from '../../api/episodes/schemas/schema-episode-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { SearchPagination } from '../../api/search/episodes/search-episodes-action.js'
 */

import html from 'fragtml'

/**
 * @typedef {TypeEpisodeRead & { rank: number }} EpisodeSearchResult
 */

/**
 * @typedef {object} EpisodeSearchPageState
 * @property {string} query
 * @property {EpisodeSearchResult[]} episodes
 * @property {SearchPagination} pagination
 * @property {string} queryString
 */

/**
 * @typedef {ViewContext & { episodeSearchPage: EpisodeSearchPageState }} EpisodeSearchPageContext
 */

/**
 * @type {FragtmlTemplate<EpisodeSearchPageContext, AppLayoutName, AppFragmentId>}
 */
export const episodeSearchPage = (context) => html/* html */`
  <div class="bc-search-page">
    <h1>Episode Search</h1>
    <form class="bc-search-form" method="get" action="/search/episodes/">
      <input type="search" name="query" placeholder="Search episodes" autocomplete="off" aria-label="Search episodes" value="${context.episodeSearchPage.query}" autofocus>
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${searchResourceNav(context.episodeSearchPage.query)}
    ${paginationControls(context)}
    <div class="${context.episodeSearchPage.episodes.length === 0 ? 'bc-search-results bc-search-results-empty' : 'bc-search-results'}">
      ${context.episodeSearchPage.episodes.length > 0
        ? context.episodeSearchPage.episodes.map(episode => episodeResult(episode))
        : html`<div class="bc-search-empty">${context.episodeSearchPage.query ? 'No episodes found.' : 'Search for episodes.'}</div>`}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @param {EpisodeSearchResult} episode
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function episodeResult (episode) {
  const createdAt = toDate(episode.created_at)
  const title = episode.display_title || episode.title || episode.bookmark?.title || episode.url

  return html/* html */`
    <article class="bc-search-result bc-episode-search-result">
      <h2><a href="/episodes/view/?id=${episode.id}">${title}</a></h2>
      ${episode.url ? html`<div class="bc-bookmark-url-display"><a href="${episode.url}" rel="noreferrer">${displayUrl(episode.url)}</a></div>` : null}
      ${episode.text_content ? html`<p>${trimText(episode.text_content)}</p>` : null}
      ${episode.bookmark ? html`<div class="bc-date"><a href="/bookmarks/view/?id=${episode.bookmark.id}">Bookmark</a></div>` : null}
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
      <a href="/search/archives/${suffix}">Archives</a>
      <a aria-current="page" href="/search/episodes/${suffix}">Episodes</a>
    </nav>
  `
}

/**
 * @param {EpisodeSearchPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.episodeSearchPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Episode search pagination">
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
 * @param {EpisodeSearchPageContext} context
 * @param {import('../../api/search/episodes/search-episodes-action.js').SearchPageCursor} cursor
 * @returns {string}
 */
function searchUrl (context, cursor) {
  const params = new URLSearchParams(context.episodeSearchPage.queryString)
  params.set('query', cursor.query)
  params.set('rank', cursor.rank)
  params.set('id', cursor.id)
  params.set('reverse', String(cursor.reverse))

  return `/search/episodes/?${params.toString()}`
}

/**
 * @param {Date | string | undefined} value
 * @returns {Date | null}
 */
function toDate (value) {
  if (!value) return null
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

/**
 * @param {string} value
 * @returns {string}
 */
function trimText (value) {
  return value.length > 280 ? `${value.slice(0, 280)}...` : value
}
