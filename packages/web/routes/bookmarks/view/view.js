/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeBookmarkRead } from '../../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'
import { bookmarkView } from '../list.view.js'

/**
 * @typedef {object} BookmarkViewPageState
 * @property {TypeBookmarkRead | null} bookmark
 * @property {string | null} error
 * @property {boolean} edit
 * @property {BookmarkEditFormState | null} editForm
 */

/**
 * @typedef {object} BookmarkEditFormState
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string} note
 * @property {string} summary
 * @property {string} tags
 * @property {string} archiveUrls
 * @property {boolean} toread
 * @property {boolean} starred
 * @property {boolean} sensitive
 * @property {boolean} normalize
 * @property {FormError[]} errors
 */

/**
 * @typedef {ViewContext & { bookmarkViewPage: BookmarkViewPageState }} BookmarkViewPageContext
 */

/**
 * @type {FragtmlTemplate<BookmarkViewPageContext, AppLayoutName, AppFragmentId>}
 */
export const bookmarkViewPage = (context) => html/* html */`
  <div class="bc-bookmark-detail-page">
    <form class="bc-search-form" method="get" action="/search/bookmarks/">
      <input type="search" name="query" placeholder="Search bookmarks" autocomplete="off" aria-label="Search bookmarks">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${context.bookmarkViewPage.error
      ? html`<div class="bc-form-errors" role="alert"><p>${context.bookmarkViewPage.error}</p></div>`
      : null}
    ${context.bookmarkViewPage.bookmark
      ? html/* html */`
        <div class="bc-bookmark">
          ${context.bookmarkViewPage.edit && context.bookmarkViewPage.editForm
            ? bookmarkEditForm(context.bookmarkViewPage.editForm)
            : bookmarkView(context.bookmarkViewPage.bookmark, { redirectPath: context.currentPath })}
        </div>
      `
      : null}
  </div>
`

/**
 * @param {BookmarkEditFormState} form
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function bookmarkEditForm (form) {
  return html/* html */`
    <article id="bc-bookmark-${form.id}" class="bc-bookmark-view bc-bookmark-edit-view">
      <form
        class="bc-bookmark-edit-form"
        method="post"
        action="/bookmarks/view/"
        hx-post="/bookmarks/view/"
        hx-target="#bc-bookmark-${form.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${form.id}">
        ${form.errors.length > 0
          ? html/* html */`
            <div class="bc-form-errors" role="alert">
              ${form.errors.map(error => html`<p>${error.message}</p>`)}
            </div>
          `
          : null}
        <fieldset>
          <label class="bc-field">
            <span>URL</span>
            <input type="url" name="url" value="${form.url}" required>
          </label>
          <label class="bc-field">
            <span>Title</span>
            <input type="text" name="title" maxlength="255" value="${form.title}" required>
          </label>
          <label class="bc-field">
            <span>Note</span>
            <textarea rows="5" name="note">${form.note}</textarea>
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
              value="${form.tags}"
            >
            <span class="bc-help-text">Separate tags with spaces.</span>
          </label>
          <details ${form.summary ? html`open` : null}>
            <summary>Summary</summary>
            <label class="bc-field">
              <span>Summary</span>
              <textarea rows="3" name="summary">${form.summary}</textarea>
            </label>
          </details>
          <details ${form.archiveUrls ? html`open` : null}>
            <summary>Archive URLs</summary>
            <label class="bc-field">
              <span>Public archive URLs</span>
              <textarea rows="3" name="archiveUrls">${form.archiveUrls}</textarea>
            </label>
            <span class="bc-help-text">One URL per line.</span>
          </details>
          <div class="bc-inline-options">
            <label class="bc-checkbox-field">
              <input type="checkbox" name="toread" value="true" ${form.toread ? html`checked` : null}>
              <span>To read</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="starred" value="true" ${form.starred ? html`checked` : null}>
              <span>Starred</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="sensitive" value="true" ${form.sensitive ? html`checked` : null}>
              <span>Sensitive</span>
            </label>
            <label class="bc-checkbox-field">
              <input type="checkbox" name="normalize" value="true" ${form.normalize ? html`checked` : null}>
              <span>Normalize URLs</span>
            </label>
          </div>
          <div class="bc-form-actions">
            <button class="bc-button bc-button-primary" type="submit">Save changes</button>
            <a href="/bookmarks/view/?id=${form.id}">Cancel</a>
          </div>
        </fieldset>
      </form>
    </article>
  `
}
