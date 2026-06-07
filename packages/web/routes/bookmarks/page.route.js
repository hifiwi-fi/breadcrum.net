/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { TypeBookmarkRead } from '../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { ViewContext } from '#views/context.js'
 * @import { BookmarkFilters, BookmarkPagination } from './bookmarks-page-data.js'
 */

import html from 'fragtml'
import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getBookmarksPageData } from './bookmarks-page-data.js'
import { bookmarkView } from './bookmark.view.js'

/**
 * @typedef {object} BookmarksPageState
 * @property {TypeBookmarkRead[]} bookmarks
 * @property {BookmarkPagination} pagination
 * @property {BookmarkFilters} filters
 */

/**
 * @typedef {object} BookmarksPageData
 * @property {ViewContext} context
 * @property {BookmarksPageState} bookmarksPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BookmarksPageData | undefined>}
 */
export async function load ({ request, reply }) {
  const fastify = request.server
  const context = await createRouteViewContext(fastify, request, {
    title: 'Bookmarks',
  })

  if (!context.user) {
    redirectForRequest(request, reply, loginRedirectForRequest(request))
    return
  }

  const filters = bookmarkFilters(request)
  const pageData = await getBookmarksPageData(fastify, {
    userId: context.user.id,
    filters,
  })

  return {
    context,
    bookmarksPage: {
      ...pageData,
      filters,
    },
  }
}

/**
 * @param {{ data: BookmarksPageData }} ctx
 */
export default function bookmarksPage ({ data }) {
  return html/* html */`
    <div class="bc-bookmarks-page">
      <h1>Bookmarks</h1>
      <form class="bc-search-form" method="get" action="/search/bookmarks/">
        <input type="search" name="query" placeholder="Search bookmarks" autocomplete="off" aria-label="Search bookmarks">
        <button class="bc-button" type="submit">Search</button>
      </form>
      <div class="bc-bookmarks-actions">
        ${quickAddForm()}
        ${data.bookmarksPage.filters.tag
          ? html/* html */`
            <span class="bc-tag-filter-remove">
              Tag: ${data.bookmarksPage.filters.tag}
              <a href="${bookmarksUrl(data, { tag: null })}">remove</a>
            </span>
          `
          : null}
      </div>
      ${paginationControls(data)}
      <div class="${data.bookmarksPage.bookmarks.length === 0 ? 'bc-bookmarks-results bc-bookmarks-results-empty' : 'bc-bookmarks-results'}">
        ${data.bookmarksPage.bookmarks.length === 0
          ? html/* html */`
            <div class="bc-bookmarks-empty-state">
              <div class="bc-bookmarks-empty">Add your first bookmark.</div>
              ${quickAddForm()}
            </div>
          `
          : bookmarkRows(data.bookmarksPage.bookmarks, data.context.currentPath)}
      </div>
      ${paginationControls(data)}
    </div>
  `
}

/**
 * @returns {HtmlRenderable}
 */
function quickAddForm () {
  return html/* html */`
    <form class="bc-quick-add-form" method="get" action="/bookmarks/add/">
      <label class="bc-quick-add-label">
        <span>URL</span>
        <input type="url" name="url" placeholder="Paste a URL to bookmark" required>
      </label>
      <button class="bc-button" type="submit">Add</button>
    </form>
  `
}

/**
 * @param {BookmarksPageData} data
 * @returns {HtmlRenderable}
 */
function paginationControls (data) {
  const { pagination } = data.bookmarksPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Bookmarks pagination">
      <div class="pagination-buttons-nav">
        ${pagination.before
          ? html`<a class="pagination-button" href="${bookmarksUrl(data, { before: pagination.before, after: null })}">earlier</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`}
        ${pagination.after
          ? html`<a class="pagination-button" href="${bookmarksUrl(data, { after: pagination.after, before: null })}">later</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {TypeBookmarkRead[]} bookmarks
 * @param {string} redirectPath
 * @returns {HtmlRenderable[]}
 */
function bookmarkRows (bookmarks, redirectPath) {
  /** @type {HtmlRenderable[]} */
  const rows = []
  let lastDateValue = ''

  for (let index = 0; index < bookmarks.length; index += 1) {
    const bookmark = bookmarks[index]
    if (!bookmark) continue

    const createdAt = toDate(bookmark.created_at)
    const dateValue = formatDateValue(createdAt)
    const isDayChange = Boolean(dateValue && lastDateValue && dateValue !== lastDateValue)

    if (isDayChange && createdAt) {
      rows.push(html/* html */`
        <div class="bc-bookmark-date-separator">
          <span>${dateValue} ${weekdayName(createdAt)}</span>
        </div>
      `)
    }

    const nextBookmark = bookmarks[index + 1]
    const nextDateValue = nextBookmark ? formatDateValue(toDate(nextBookmark.created_at)) : ''
    const groupEndClass = dateValue && nextDateValue && dateValue !== nextDateValue
      ? ' bc-bookmark-group-end'
      : ''

    rows.push(html/* html */`
      <div class="bc-bookmark${groupEndClass}">
        ${bookmarkView(bookmark, { redirectPath })}
      </div>
    `)

    if (dateValue) lastDateValue = dateValue
  }

  return rows
}

/**
 * @param {BookmarksPageData} data
 * @param {object} changes
 * @param {Date | null} [changes.before]
 * @param {Date | null} [changes.after]
 * @param {string | null} [changes.tag]
 * @returns {string}
 */
function bookmarksUrl (data, changes) {
  const params = new URLSearchParams(data.bookmarksPage.filters.queryString)

  if ('before' in changes) {
    if (changes.before) params.set('before', String(changes.before.valueOf()))
    else params.delete('before')
  }

  if ('after' in changes) {
    if (changes.after) params.set('after', String(changes.after.valueOf()))
    else params.delete('after')
  }

  if ('tag' in changes) {
    if (changes.tag) params.set('tag', changes.tag)
    else params.delete('tag')
  }

  const query = params.toString()
  return query ? `/bookmarks/?${query}` : '/bookmarks/'
}

/**
 * @param {FastifyRequest} request
 * @returns {BookmarkFilters}
 */
function bookmarkFilters (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const params = url.searchParams

  return {
    before: dateCursor(params.get('before')),
    after: dateCursor(params.get('after')),
    perPage: integerParam(params.get('per_page'), 20, 1, 200),
    tag: stringParam(params.get('tag'), 255),
    sensitive: booleanParam(params.get('sensitive')),
    starred: booleanParam(params.get('starred')),
    toread: booleanParam(params.get('toread')),
    queryString: params.toString(),
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {string | null} value
 * @returns {Date | null}
 */
function dateCursor (value) {
  if (!value) return null

  const numericValue = Number(value)
  const date = Number.isFinite(numericValue) && value.trim() !== ''
    ? new Date(numericValue)
    : new Date(value)

  return Number.isNaN(date.valueOf()) ? null : date
}

/**
 * @param {string | null} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function integerParam (value, fallback, min, max) {
  if (!value) return fallback
  const number = Number.parseInt(value, 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, min), max)
}

/**
 * @param {string | null} value
 * @param {number} maxLength
 * @returns {string}
 */
function stringParam (value, maxLength) {
  if (!value) return ''
  return value.trim().slice(0, maxLength)
}

/**
 * @param {string | null} value
 * @returns {boolean}
 */
function booleanParam (value) {
  return value === 'true'
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
 * @param {Date | null} date
 * @returns {string}
 */
function formatDateValue (date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * @param {Date} date
 * @returns {string}
 */
function weekdayName (date) {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][date.getDay()] ?? ''
}
