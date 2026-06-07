/**
 * @import { FastifyReply, FastifyRequest } from 'fastify'
 * @import { RoutePageContext } from '@domstack/fastify'
 * @import { HtmlRenderable } from 'fragtml/types.js'
 * @import { TypeBookmarkRead } from '../../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { FormError } from '#lib/htmx.js'
 * @import { ViewContext } from '#views/context.js'
 */

import html, { render } from 'fragtml'
import { isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { getBookmark } from '../../api/bookmarks/get-bookmarks-query.js'
import { bookmarkView } from '../bookmark.view.js'

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
 * @typedef {object} BookmarkViewPageData
 * @property {ViewContext} context
 * @property {BookmarkViewPageState} bookmarkViewPage
 */

/**
 * @param {RoutePageContext} ctx
 * @returns {Promise<BookmarkViewPageData | undefined>}
 */
export async function load ({ request, reply, state }) {
  if (!request || !reply) throw new Error('Bookmark detail page requires a Fastify request')

  const context = await createRouteViewContext(request.server, request, {
    title: 'Bookmark',
  })

  if (!context.user) {
    redirectAndSend(request, reply, loginRedirectForRequest(request))
    return
  }

  const url = new URL(request.url, 'https://breadcrum.invalid')
  const id = url.searchParams.get('id')
  if (!id) {
    redirectAndSend(request, reply, '/bookmarks/')
    return
  }

  const edit = url.searchParams.get('edit') === 'true'
  const bookmark = await getBookmark({
    fastify: request.server,
    ownerId: context.user.id,
    bookmarkId: id,
    sensitive: edit || url.searchParams.get('sensitive') === 'true',
    perPage: 1,
  })

  if (!bookmark) {
    reply.status(404)
  }

  if (bookmark && isHtmxRequest(request) && url.searchParams.get('fragment') === 'bookmark') {
    const redirectPath = safeRedirectPath(
      url.searchParams.get('redirect'),
      `/bookmarks/view/?id=${bookmark.id}`
    )
    const body = await render(bookmarkView(bookmark, { redirectPath }))
    reply.type('text/html').send(body)
    return
  }

  return {
    context: {
      ...context,
      title: bookmark?.title ?? 'Bookmark',
    },
    bookmarkViewPage: state.bookmarkViewPage ?? {
      bookmark: bookmark ?? null,
      error: bookmark ? null : 'Bookmark not found.',
      edit,
      editForm: bookmark ? bookmarkEditFormFromBookmark(bookmark) : null,
    },
  }
}

/**
 * @param {{ data: BookmarkViewPageData }} ctx
 * @returns {HtmlRenderable}
 */
export default function bookmarkViewPage ({ data }) {
  return html/* html */`
    <div class="bc-bookmark-detail-page">
      <form class="bc-search-form" method="get" action="/search/bookmarks/">
        <input type="search" name="query" placeholder="Search bookmarks" autocomplete="off" aria-label="Search bookmarks">
        <button class="bc-button" type="submit">Search</button>
      </form>
      ${data.bookmarkViewPage.error
        ? html`<div class="bc-form-errors" role="alert"><p>${data.bookmarkViewPage.error}</p></div>`
        : null}
      ${data.bookmarkViewPage.bookmark
        ? html/* html */`
          <div class="bc-bookmark">
            ${data.bookmarkViewPage.edit && data.bookmarkViewPage.editForm
              ? bookmarkEditForm(data.bookmarkViewPage.editForm)
              : bookmarkView(data.bookmarkViewPage.bookmark, { redirectPath: data.context.currentPath })}
          </div>
        `
        : null}
    </div>
  `
}

/**
 * @param {BookmarkEditFormState} form
 * @returns {HtmlRenderable}
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
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/view/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {TypeBookmarkRead} bookmark
 * @returns {BookmarkEditFormState}
 */
function bookmarkEditFormFromBookmark (bookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title || bookmark.url,
    note: bookmark.note ?? '',
    summary: bookmark.summary ?? '',
    tags: bookmark.tags.join(' '),
    archiveUrls: bookmark.archive_urls.join('\n'),
    toread: Boolean(bookmark.toread),
    starred: Boolean(bookmark.starred),
    sensitive: Boolean(bookmark.sensitive),
    normalize: true,
    errors: [],
  }
}
