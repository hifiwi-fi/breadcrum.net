/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { FormError } from '#lib/htmx.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

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
 * @typedef {ViewContext & { bookmarkAdd: BookmarkAddFormState }} BookmarkAddPageContext
 */

/**
 * @type {FragtmlTemplate<BookmarkAddPageContext, AppLayoutName, AppFragmentId>}
 */
export const bookmarkAddPage = (context) => html/* html */`
  <div class="bc-bookmark-add-page">
    <h1>Add bookmark</h1>
    <form class="bc-bookmark-add-form" method="post" action="/bookmarks/add/">
      ${context.bookmarkAdd.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${context.bookmarkAdd.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <fieldset>
        <label class="bc-field">
          <span>URL</span>
          <input type="url" name="url" value="${context.bookmarkAdd.url}" required>
        </label>
        <label class="bc-field">
          <span>Title</span>
          <input type="text" name="title" maxlength="255" value="${context.bookmarkAdd.title}">
        </label>
        <label class="bc-field">
          <span>Note</span>
          <textarea rows="5" name="note">${context.bookmarkAdd.note}</textarea>
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
            value="${context.bookmarkAdd.tags}"
          >
          <span class="bc-help-text">Separate tags with spaces.</span>
        </label>
        <details>
          <summary>Summary</summary>
          <label class="bc-field">
            <span>Summary</span>
            <textarea rows="3" name="summary">${context.bookmarkAdd.summary}</textarea>
          </label>
        </details>
        <details ${context.bookmarkAdd.archiveUrl ? html`open` : null}>
          <summary>Archive URL</summary>
          <label class="bc-field">
            <span>Public archive URL</span>
            <input type="url" name="archiveUrl" value="${context.bookmarkAdd.archiveUrl}">
          </label>
        </details>
        <div class="bc-inline-options">
          <label class="bc-checkbox-field">
            <input type="checkbox" name="toread" value="true" ${context.bookmarkAdd.toread ? html`checked` : null}>
            <span>To read</span>
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="sensitive" value="true" ${context.bookmarkAdd.sensitive ? html`checked` : null}>
            <span>Sensitive</span>
          </label>
        </div>
        <div class="bc-inline-options">
          <label class="bc-checkbox-field">
            <input type="checkbox" name="meta" value="true" ${context.bookmarkAdd.meta ? html`checked` : null}>
            <span>Resolve metadata</span>
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="episode" value="true" ${context.bookmarkAdd.episode ? html`checked` : null}>
            <span>Resolve episode</span>
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="archive" value="true" ${context.bookmarkAdd.archive ? html`checked` : null}>
            <span>Create archive</span>
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="normalize" value="true" ${context.bookmarkAdd.normalize ? html`checked` : null}>
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
