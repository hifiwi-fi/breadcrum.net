/**
 * @import { TypeArchiveRead } from '../api/archives/schemas/schema-archive-read.js'
 * @import { FormError } from '#lib/htmx.js'
 */

import html, { raw } from 'fragtml'

const RESOLVE_TIMEOUT_MS = 5 * 60 * 60 * 1000

/**
 * @typedef {object} ArchiveEditFormState
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string} redirect
 * @property {FormError[]} errors
 */

/**
 * @param {TypeArchiveRead} archive
 * @param {object} [options]
 * @param {boolean} [options.fullView]
 * @param {string} [options.redirectPath]
 * @param {string} [options.deleteRedirectPath]
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function archiveArticle (archive, options = {}) {
  const fullView = Boolean(options.fullView)
  const title = archive.display_title || archive.title || archive.bookmark?.title || archive.url
  const createdAt = toDate(archive.created_at)
  const articleDate = toDate(archive.published_time) ?? createdAt
  const isResolving = withinResolvingWindow(archive.created_at) && archive.ready === false && !archive.error

  return html/* html */`
    <article
      id="bc-archive-${archive.id}"
      class="bc-archive-view"
      ${isResolving
        ? html`hx-get="${archiveFragmentUrl(archive, options.redirectPath ?? '/archives/')}" hx-trigger="every 5s" hx-target="#bc-archive-${archive.id}" hx-swap="outerHTML"`
        : null}
    >
      ${fullView
        ? html`<h1 class="bc-archive-title"><a href="${archive.url}" rel="noreferrer">${title}</a></h1>`
        : html/* html */`
          <div class="bc-archive-title">
            <span class="bc-status-token">${archive.error ? 'Error' : archive.ready ? 'Ready' : 'Resolving'}</span>
            <a href="/archives/view/?id=${archive.id}">${title}</a>
          </div>
        `}

      <div class="bc-bookmark-url-display">
        <a href="${archive.url}" rel="noreferrer">${archive.site_name || displayUrl(archive.url)}</a>
        ${archive.byline ? html`<span>${archive.byline}</span>` : null}
      </div>

      ${archive.bookmark
        ? html/* html */`
          <div class="bc-archive-bookmark-title">
            Bookmark:
            <a class="bc-archive-bookmark-title-text" href="/bookmarks/view/?id=${archive.bookmark.id}">
              ${archive.bookmark.title || archive.bookmark.url}
            </a>
          </div>
        `
        : null}

      ${archive.excerpt ? html`<p class="bc-archive-excerpt">${archive.excerpt}</p>` : null}

      ${articleDate
        ? html/* html */`
          <div class="bc-date">
            <a href="/archives/view/?id=${archive.id}">
              <time datetime="${articleDate.toISOString()}">${articleDate.toLocaleString()}</time>
            </a>
          </div>
        `
        : null}

      ${isResolving ? html`<div class="bc-resolve-status">Resolving archive content.</div>` : null}

      ${fullView && archive.error
        ? html/* html */`
          <details class="bc-archive-error-box">
            <summary>Error</summary>
            <pre>${archive.error}</pre>
          </details>
        `
        : null}

      ${fullView ? archiveContent(archive) : null}

      <div class="bc-row-actions">
        <a href="/archives/view/?id=${archive.id}">View</a>
        <a href="/archives/view/?id=${archive.id}&amp;edit=true">Edit</a>
        ${deleteForm(archive, options.deleteRedirectPath ?? options.redirectPath ?? '/archives/')}
      </div>

      ${fullView ? archiveFooter(archive) : null}
    </article>
  `
}

/**
 * @param {ArchiveEditFormState} form
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function archiveEditForm (form) {
  return html/* html */`
    <article id="bc-archive-${form.id}" class="bc-archive-edit">
      ${form.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${form.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <form
        method="post"
        action="/archives/view/"
        hx-post="/archives/view/"
        hx-target="#bc-archive-${form.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${form.id}">
        <input type="hidden" name="redirect" value="${form.redirect}">
        <fieldset>
          <legend class="bc-archive-legend">Edit archive</legend>
          <label class="bc-field">
            <span>URL</span>
            <input disabled type="url" name="url" value="${form.url}">
          </label>
          <label class="bc-field">
            <span>Title</span>
            <input type="text" name="title" value="${form.title}" maxlength="255">
          </label>
          <div class="bc-form-actions">
            <button class="bc-button bc-button-primary" type="submit">Save archive</button>
            <a class="bc-button" href="/archives/view/?id=${form.id}">Cancel</a>
          </div>
        </fieldset>
      </form>
      ${deleteForm({ id: form.id }, form.redirect)}
    </article>
  `
}

/**
 * @param {TypeArchiveRead} archive
 * @returns {ArchiveEditFormState}
 */
export function archiveEditFormFromArchive (archive) {
  return {
    id: archive.id ?? '',
    url: archive.url ?? '',
    title: archive.title || archive.display_title || archive.bookmark?.title || '',
    redirect: `/archives/view/?id=${archive.id}`,
    errors: [],
  }
}

/**
 * Archive HTML is sanitized by the archive extraction worker before storage.
 *
 * @param {TypeArchiveRead} archive
 * @returns {import('fragtml/types.js').HtmlRenderable | null}
 */
function archiveContent (archive) {
  if (archive.html_content) {
    return html`<div class="bc-archive-html-content">${raw(archive.html_content)}</div>`
  }

  if (archive.text_content) {
    return html`<pre class="bc-archive-text-content">${archive.text_content}</pre>`
  }

  return null
}

/**
 * @param {TypeArchiveRead | { id: string }} archive
 * @param {string} redirectPath
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function deleteForm (archive, redirectPath) {
  return html/* html */`
    <details class="bc-delete-details">
      <summary>Delete</summary>
      <form
        method="post"
        action="/archives/delete/"
        hx-post="/archives/delete/"
        hx-target="#bc-archive-${archive.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${archive.id}">
        <input type="hidden" name="redirect" value="${redirectPath}">
        <button class="bc-button" type="submit">Delete archive</button>
      </form>
    </details>
  `
}

/**
 * @param {TypeArchiveRead} archive
 * @returns {import('fragtml/types.js').HtmlRenderable | null}
 */
function archiveFooter (archive) {
  const rows = [
    [
      { label: 'Extraction', value: archive.extraction_method ? html`<code>${archive.extraction_method}</code>` : null },
      { label: 'Language', value: archive.language ? html`<code>${archive.language}</code>` : null },
      { label: 'Direction', value: archive.direction ? html`<code>${archive.direction}</code>` : null },
      { label: 'Length', value: archive.length != null ? archive.length.toLocaleString() : null },
    ],
    [
      { label: 'Done', value: typeof archive.done === 'boolean' ? (archive.done ? 'yes' : 'no') : null },
      { label: 'Ready', value: typeof archive.ready === 'boolean' ? (archive.ready ? 'yes' : 'no') : null },
    ],
    [
      { label: 'Published', value: formatDate(archive.published_time) },
      { label: 'Created', value: formatDate(archive.created_at) },
      { label: 'Updated', value: formatDate(archive.updated_at) },
    ],
  ].map(row => row.filter(item => item.value != null && item.value !== ''))
    .filter(row => row.length > 0)

  if (rows.length === 0) return null

  return html/* html */`
    <div class="bc-archive-footer">
      <div class="bc-metadata-grid">
        ${rows.map(row => html/* html */`
          <div class="bc-metadata-row">
            ${row.map(item => html/* html */`
              <div class="bc-metadata-item">
                <span class="bc-metadata-label">${item.label}</span>
                <span class="bc-metadata-value">${item.value}</span>
              </div>
            `)}
          </div>
        `)}
      </div>
    </div>
  `
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {boolean}
 */
function withinResolvingWindow (value) {
  const date = toDate(value)
  if (!date) return false
  return Date.now() - date.getTime() < RESOLVE_TIMEOUT_MS
}

/**
 * @param {TypeArchiveRead} archive
 * @param {string} redirectPath
 * @returns {string}
 */
function archiveFragmentUrl (archive, redirectPath) {
  const params = new URLSearchParams({
    id: archive.id ?? '',
    fragment: 'archive',
    redirect: redirectPath,
  })

  return `/archives/view/?${params.toString()}`
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {Date | null}
 */
function toDate (value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

/**
 * @param {Date | string | null | undefined} value
 * @returns {string | null}
 */
function formatDate (value) {
  const date = toDate(value)
  return date ? date.toLocaleString() : null
}

/**
 * @param {string} url
 * @returns {string}
 */
function displayUrl (url) {
  return url.replace(/^https?:\/\//, '')
}
