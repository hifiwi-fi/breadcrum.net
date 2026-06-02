/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeBookmarkRead } from '../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { BookmarkFilters, BookmarkPagination } from './bookmarks-page-data.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} BookmarksPageState
 * @property {TypeBookmarkRead[]} bookmarks
 * @property {BookmarkPagination} pagination
 * @property {BookmarkFilters} filters
 */

/**
 * @typedef {ViewContext & { bookmarksPage: BookmarksPageState }} BookmarksPageContext
 */

/**
 * @type {FragtmlTemplate<BookmarksPageContext, AppLayoutName, AppFragmentId>}
 */
export const bookmarksPage = (context) => html/* html */`
  <div class="bc-bookmarks-page">
    <h1>Bookmarks</h1>
    <form class="bc-search-form" method="get" action="/search/bookmarks/">
      <input type="search" name="query" placeholder="Search bookmarks" autocomplete="off" aria-label="Search bookmarks">
      <button class="bc-button" type="submit">Search</button>
    </form>
    <div class="bc-bookmarks-actions">
      ${quickAddForm()}
      ${context.bookmarksPage.filters.tag
        ? html/* html */`
          <span class="bc-tag-filter-remove">
            Tag: ${context.bookmarksPage.filters.tag}
            <a href="${bookmarksUrl(context, { tag: null })}">remove</a>
          </span>
        `
        : null}
    </div>
    ${paginationControls(context)}
    <div class="${context.bookmarksPage.bookmarks.length === 0 ? 'bc-bookmarks-results bc-bookmarks-results-empty' : 'bc-bookmarks-results'}">
      ${context.bookmarksPage.bookmarks.length === 0
        ? html/* html */`
          <div class="bc-bookmarks-empty-state">
            <div class="bc-bookmarks-empty">Add your first bookmark.</div>
            ${quickAddForm()}
          </div>
        `
        : bookmarkRows(context.bookmarksPage.bookmarks, context.currentPath)}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
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
 * @param {BookmarksPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.bookmarksPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Bookmarks pagination">
      <div class="pagination-buttons-nav">
        ${pagination.before
          ? html`<a class="pagination-button" href="${bookmarksUrl(context, { before: pagination.before, after: null })}">earlier</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`}
        ${pagination.after
          ? html`<a class="pagination-button" href="${bookmarksUrl(context, { after: pagination.after, before: null })}">later</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {TypeBookmarkRead[]} bookmarks
 * @param {string} redirectPath
 * @returns {import('fragtml/types.js').HtmlRenderable[]}
 */
function bookmarkRows (bookmarks, redirectPath) {
  /** @type {import('fragtml/types.js').HtmlRenderable[]} */
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
 * @param {TypeBookmarkRead} bookmark
 * @param {{ redirectPath?: string }} [options]
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function bookmarkView (bookmark, options = {}) {
  const createdAt = toDate(bookmark.created_at)
  const redirectPath = options.redirectPath ?? '/bookmarks/'
  const visibleArchives = (bookmark.archives ?? []).filter(archive => archive && !archive.error)
  const visibleEpisodes = (bookmark.episodes ?? []).filter(episode => episode && !episode.error)
  const isResolving = Boolean(
    createdAt &&
    Date.now() - createdAt.getTime() < 10 * 60 * 1000 &&
    (
      bookmark.done === false ||
      (bookmark.archives ?? []).some(archive => archive?.ready === false && !archive.error) ||
      (bookmark.episodes ?? []).some(episode => episode?.ready === false && !episode.error)
    )
  )

  return html/* html */`
    <article
      id="bc-bookmark-${bookmark.id}"
      class="bc-bookmark-view"
      ${isResolving
        ? html`hx-get="${bookmarkFragmentUrl(bookmark, redirectPath)}" hx-trigger="every 5s" hx-target="#bc-bookmark-${bookmark.id}" hx-swap="outerHTML"`
        : null}
    >
      <div class="bc-bookmark-title-line">
        ${toggleForm(bookmark, 'toread', 'To read', Boolean(bookmark.toread), redirectPath)}
        ${toggleForm(bookmark, 'starred', 'Starred', Boolean(bookmark.starred), redirectPath)}
        ${toggleForm(bookmark, 'sensitive', 'Sensitive', Boolean(bookmark.sensitive), redirectPath)}
        <a class="${bookmark.toread ? 'bc-bookmark-title bc-bookmark-title-toread' : 'bc-bookmark-title'}" href="${bookmark.url}" target="_blank" rel="noreferrer">
          ${bookmark.title || bookmark.url}
        </a>
      </div>
      <div class="bc-bookmark-url-display"><a href="${bookmark.url}" rel="noreferrer">${displayUrl(bookmark.url)}</a></div>
      ${bookmark.note ? html`<div class="bc-bookmark-note-display">${paragraphs(bookmark.note)}</div>` : null}
      ${bookmark.summary ? html`<div class="bc-bookmark-summary-display">${paragraphs(bookmark.summary)}</div>` : null}
      ${bookmark.tags.length > 0
        ? html/* html */`
          <div class="bc-tags-display">
            <span>Tags</span>
            ${bookmark.tags.map(tag => html`<a href="/bookmarks/?tag=${tag}">${tag}</a>`)}
          </div>
        `
        : null}
      <div class="bc-bookmark-entity-enumeration">
        ${visibleArchives.length > 0
          ? html`<span class="bc-bookmark-entity bc-archive-entity"><a href="${visibleArchives.length > 1 ? `/archives/?bid=${bookmark.id}` : `/archives/view/?id=${visibleArchives[0]?.id}`}">${visibleArchives.length} archive${visibleArchives.length > 1 ? 's' : ''}</a></span>`
          : null}
        ${visibleEpisodes.length > 0
          ? html`<span class="bc-bookmark-entity bc-episode-entity"><a href="${visibleEpisodes.length > 1 ? `/episodes/?bid=${bookmark.id}` : `/episodes/view/?id=${visibleEpisodes[0]?.id}`}">${visibleEpisodes.length} episode${visibleEpisodes.length > 1 ? 's' : ''}</a></span>`
          : null}
        ${isResolving ? html`<span class="bc-bookmark-entity">Resolving</span>` : null}
      </div>
      ${bookmark.archive_urls?.length > 0
        ? bookmark.archive_urls.map(url => html`<div class="bc-bookmark-archive-url-display"><a href="${url}" rel="noreferrer">${displayUrl(url)}</a></div>`)
        : null}
      <div class="bc-date">
        <a href="/bookmarks/view/?id=${bookmark.id}">
          <time datetime="${createdAt?.toISOString() ?? ''}">${createdAt ? createdAt.toLocaleString() : ''}</time>
        </a>
      </div>
      <div class="bc-bookmark-row-actions">
        <a href="/bookmarks/view/?id=${bookmark.id}">View</a>
        <a href="/bookmarks/view/?id=${bookmark.id}&amp;edit=true">Edit</a>
        ${deleteForm(bookmark)}
      </div>
    </article>
  `
}

/**
 * @param {TypeBookmarkRead} bookmark
 * @param {'toread' | 'starred' | 'sensitive'} field
 * @param {string} label
 * @param {boolean} active
 * @param {string | undefined} redirectPath
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function toggleForm (bookmark, field, label, active, redirectPath) {
  return html/* html */`
    <form
      class="bc-bookmark-toggle-form"
      method="post"
      action="/bookmarks/toggle/"
      hx-post="/bookmarks/toggle/"
      hx-target="#bc-bookmark-${bookmark.id}"
      hx-swap="outerHTML"
    >
      <input type="hidden" name="id" value="${bookmark.id}">
      <input type="hidden" name="field" value="${field}">
      <input type="hidden" name="redirect" value="${redirectPath ?? '/bookmarks/'}">
      <button
        class="bc-bookmark-state ${active ? 'bc-bookmark-state-active' : ''}"
        type="submit"
        aria-label="${active ? 'Unset' : 'Set'} ${label} for ${bookmark.title || bookmark.url}"
        aria-pressed="${active ? 'true' : 'false'}"
      >${label}</button>
    </form>
  `
}

/**
 * @param {TypeBookmarkRead} bookmark
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function deleteForm (bookmark) {
  return html/* html */`
    <details class="bc-bookmark-delete-details">
      <summary>Delete</summary>
      <form
        class="bc-bookmark-delete-form"
        method="post"
        action="/bookmarks/delete/"
        hx-post="/bookmarks/delete/"
        hx-target="#bc-bookmark-${bookmark.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${bookmark.id}">
        <input type="hidden" name="redirect" value="/bookmarks/">
        <button class="bc-button" type="submit" aria-label="Delete bookmark ${bookmark.title || bookmark.url}">Delete bookmark</button>
      </form>
    </details>
  `
}

/**
 * @param {TypeBookmarkRead} bookmark
 * @param {string} redirectPath
 * @returns {string}
 */
function bookmarkFragmentUrl (bookmark, redirectPath) {
  const params = new URLSearchParams({
    id: bookmark.id,
    fragment: 'bookmark',
    redirect: redirectPath,
  })

  return `/bookmarks/view/?${params.toString()}`
}

/**
 * @param {BookmarksPageContext} context
 * @param {object} changes
 * @param {Date | null} [changes.before]
 * @param {Date | null} [changes.after]
 * @param {string | null} [changes.tag]
 * @returns {string}
 */
function bookmarksUrl (context, changes) {
  const params = new URLSearchParams(context.bookmarksPage.filters.queryString)

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
 * @param {string} value
 * @returns {import('fragtml/types.js').HtmlRenderable[]}
 */
function paragraphs (value) {
  return value.trim().split(/\n\n+/).map(paragraph => html`<p>${paragraph}</p>`)
}

/**
 * @param {string} url
 * @returns {string}
 */
function displayUrl (url) {
  return url.replace(/^https?:\/\//, '')
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
