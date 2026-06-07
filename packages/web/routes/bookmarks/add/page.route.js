/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'

/**
 * @typedef {object} BookmarkAddFormState
 * @property {string} url
 * @property {string} title
 * @property {string} note
 * @property {string} summary
 * @property {string} tags
 * @property {string} archiveUrl
 * @property {boolean} toread
 * @property {boolean} sensitive
 * @property {boolean} meta
 * @property {boolean} episode
 * @property {boolean} archive
 * @property {boolean} normalize
 * @property {FormError[]} errors
 */

/**
 * @typedef {object} BookmarkAddPageData
 * @property {ViewContext} context
 * @property {BookmarkAddFormState} bookmarkAdd
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BookmarkAddPageData | undefined>}
 */
export async function load ({ request, reply, state }) {
  const context = await createRouteViewContext(request.server, request, {
    title: 'Add Bookmark',
  })

  if (!context.user) {
    redirectForRequest(request, reply, loginRedirectForRequest(request))
    return
  }

  return {
    context,
    bookmarkAdd: state.bookmarkAdd ?? bookmarkAddQuery(request),
  }
}

/**
 * @param {{ data: BookmarkAddPageData }} ctx
 */
export default function bookmarkAddPage ({ data }) {
  return html/* html */`
    <div class="bc-bookmark-add-page">
      <h1>Add bookmark</h1>
      <form class="bc-bookmark-add-form" method="post" action="/bookmarks/add/">
        ${data.bookmarkAdd.errors.length > 0
          ? html/* html */`
            <div class="bc-form-errors" role="alert">
              ${data.bookmarkAdd.errors.map(error => html`<p>${error.message}</p>`)}
            </div>
          `
          : null}
        <fieldset>
          <label class="bc-field">
            <span>URL</span>
            <input type="url" name="url" value="${data.bookmarkAdd.url}" required>
          </label>
          <label class="bc-field">
            <span>Title</span>
            <input type="text" name="title" maxlength="255" value="${data.bookmarkAdd.title}">
          </label>
          <label class="bc-field">
            <span>Note</span>
            <textarea rows="5" name="note">${data.bookmarkAdd.note}</textarea>
          </label>
          <label class="bc-field">
            <span>Tags</span>
            <input
              type="text"
              name="tags"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              value="${data.bookmarkAdd.tags}"
            >
            <span class="bc-help-text">Separate tags with spaces.</span>
          </label>
          <details>
            <summary>Summary</summary>
            <label class="bc-field">
              <span>Summary</span>
              <textarea rows="3" name="summary">${data.bookmarkAdd.summary}</textarea>
            </label>
          </details>
          <details ${data.bookmarkAdd.archiveUrl ? html`open` : null}>
            <summary>Archive URL</summary>
            <label class="bc-field">
              <span>Public archive URL</span>
              <input type="url" name="archiveUrl" value="${data.bookmarkAdd.archiveUrl}">
            </label>
          </details>
          <div class="bc-inline-options">
            <label class="bc-checkbox-field">
              <input type="checkbox" name="toread" value="true" ${data.bookmarkAdd.toread ? html`checked` : null}>
              <span>To read</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="sensitive" value="true" ${data.bookmarkAdd.sensitive ? html`checked` : null}>
              <span>Sensitive</span>
            </label>
          </div>
          <div class="bc-inline-options">
            <label class="bc-checkbox-field">
              <input type="checkbox" name="meta" value="true" ${data.bookmarkAdd.meta ? html`checked` : null}>
              <span>Resolve metadata</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="episode" value="true" ${data.bookmarkAdd.episode ? html`checked` : null}>
              <span>Resolve episode</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="archive" value="true" ${data.bookmarkAdd.archive ? html`checked` : null}>
              <span>Create archive</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="normalize" value="true" ${data.bookmarkAdd.normalize ? html`checked` : null}>
              <span>Normalize URL</span>
            </label>
          </div>
          <div class="bc-form-actions">
            <button class="bc-button bc-button-primary" type="submit">Save bookmark</button>
            <a href="/bookmarks/">Cancel</a>
          </div>
        </fieldset>
      </form>
    </div>
  `
}

/**
 * @param {FastifyRequest} request
 * @returns {BookmarkAddFormState}
 */
function bookmarkAddQuery (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const summaryValue = url.searchParams.get('summary') ?? ''
  const pwaTextAsUrl = Boolean(!url.searchParams.get('url') && summaryValue && URL.canParse(summaryValue))
  const workingUrl = pwaTextAsUrl ? summaryValue : url.searchParams.get('url') ?? ''
  const workingSummary = pwaTextAsUrl ? '' : summaryValue
  const meta = url.searchParams.get('meta')

  return {
    url: workingUrl,
    title: url.searchParams.get('title') ?? '',
    note: url.searchParams.get('note') ?? '',
    summary: workingSummary,
    tags: url.searchParams.getAll('tags').filter(Boolean).join(' '),
    archiveUrl: '',
    toread: false,
    sensitive: false,
    meta: meta === null ? true : meta !== 'false',
    episode: true,
    archive: true,
    normalize: true,
    errors: [],
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/add/'))
  return `/login/?redirect=${redirect}`
}
