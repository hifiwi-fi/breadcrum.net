/**
 * @import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { TypeBookmarkRead } from '../../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { SearchPageCursor, SearchPagination } from '../../api/search/bookmarks/search-bookmarks-action.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { searchBookmarks } from '../../api/search/bookmarks/search-bookmarks-action.js'
import { booleanParam, clampInteger } from '../search-route-utils.js'
import { bookmarkView } from '../../bookmarks/bookmark.view.js'

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
 * @typedef {object} BookmarkSearchPageData
 * @property {ViewContext} context
 * @property {BookmarkSearchPageState} bookmarkSearchPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BookmarkSearchPageData | undefined>}
 */
export async function load ({ request, reply }) {
  if (!request || !reply) throw new Error('Bookmark search page requires a Fastify request')

  const context = await createRouteViewContext(request.server, request, {
    title: 'Bookmark Search',
  })

  if (!context.user) {
    redirectAndSend(request, reply, loginRedirectForRequest(request))
    return
  }

  const page = await bookmarkSearchPageState(request.server, context.user.id, request)

  return {
    context: {
      ...context,
      title: page.query ? `${page.query} | Bookmark Search` : 'Bookmark Search',
    },
    bookmarkSearchPage: page,
  }
}

/**
 * @param {{ data: BookmarkSearchPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function bookmarkSearchPage ({ data }) {
  return html/* html */`
    <div class="bc-search-page">
      <h1>Bookmark Search</h1>
      <form class="bc-search-form" method="get" action="/search/bookmarks/">
        <input
          type="search"
          name="query"
          placeholder="Search bookmarks"
          autocomplete="off"
          aria-label="Search bookmarks"
          value="${data.bookmarkSearchPage.query}"
          autofocus
        >
        <button class="bc-button" type="submit">Search</button>
      </form>
      ${searchResourceNav(data.bookmarkSearchPage.query)}
      ${paginationControls(data)}
      <div class="${data.bookmarkSearchPage.bookmarks.length === 0 ? 'bc-search-results bc-search-results-empty' : 'bc-search-results'}">
        ${data.bookmarkSearchPage.bookmarks.length > 0
          ? data.bookmarkSearchPage.bookmarks.map(bookmark => html/* html */`
            <div class="bc-bookmark">
              ${bookmarkView(bookmark, { redirectPath: data.context.currentPath })}
            </div>
          `)
          : html/* html */`
            <div class="bc-search-empty">
              ${data.bookmarkSearchPage.query ? 'No bookmarks found.' : 'Search for bookmarks.'}
            </div>
          `}
      </div>
      ${paginationControls(data)}
    </div>
  `
}

/**
 * @param {FastifyInstance} fastify
 * @param {string} userId
 * @param {FastifyRequest} request
 * @returns {Promise<BookmarkSearchPageState>}
 */
async function bookmarkSearchPageState (fastify, userId, request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const query = url.searchParams.get('query')?.trim() ?? ''
  const perPage = clampInteger(url.searchParams.get('per_page'), 20, 1, 50)

  if (!query) {
    return {
      query,
      bookmarks: [],
      pagination: {
        top: true,
        bottom: true,
      },
      queryString: url.searchParams.toString(),
    }
  }

  const result = await searchBookmarks(fastify, {
    userId,
    query,
    perPage,
    sensitive: booleanParam(url.searchParams.get('sensitive')),
    starred: booleanParam(url.searchParams.get('starred')),
    toread: booleanParam(url.searchParams.get('toread')),
    rank: url.searchParams.get('rank') ?? undefined,
    id: url.searchParams.get('id') ?? undefined,
    reverse: booleanParam(url.searchParams.get('reverse')),
  })

  return {
    query,
    bookmarks: result.data,
    pagination: result.pagination,
    queryString: url.searchParams.toString(),
  }
}

/**
 * @param {string} query
 * @returns {HtmlRenderable}
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
 * @param {BookmarkSearchPageData} data
 * @returns {HtmlRenderable}
 */
function paginationControls (data) {
  const { pagination } = data.bookmarkSearchPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Bookmark search pagination">
      <div class="pagination-buttons-nav">
        ${pagination.prev
          ? html`<a class="pagination-button" href="${searchUrl(data, pagination.prev)}">prev</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">prev</span>`}
        ${pagination.next
          ? html`<a class="pagination-button" href="${searchUrl(data, pagination.next)}">next</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">next</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {BookmarkSearchPageData} data
 * @param {SearchPageCursor} cursor
 * @returns {string}
 */
function searchUrl (data, cursor) {
  const params = new URLSearchParams(data.bookmarkSearchPage.queryString)
  params.set('query', cursor.query)
  params.set('rank', cursor.rank)
  params.set('id', cursor.id)
  params.set('reverse', String(cursor.reverse))

  return `/search/bookmarks/?${params.toString()}`
}

/**
 * @param {FastifyRequest} request
 * @param {FastifyReply} reply
 * @param {string} url
 * @returns {void}
 */
function redirectAndSend (request, reply, url) {
  const redirected = redirectForRequest(request, reply, url)
  if (isHtmxRequest(request)) redirected.send()
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/search/bookmarks/'))
  return `/login/?redirect=${redirect}`
}
