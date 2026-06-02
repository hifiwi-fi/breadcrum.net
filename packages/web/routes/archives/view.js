/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { ArchiveFilters, ArchivePagination } from './archives-page-data.js'
 * @import { TypeArchiveRead } from '../api/archives/schemas/schema-archive-read.js'
 */

import html from 'fragtml'
import { archiveArticle } from './archive.view.js'

/**
 * @typedef {object} ArchivesPageState
 * @property {TypeArchiveRead[]} archives
 * @property {ArchivePagination} pagination
 * @property {ArchiveFilters} filters
 */

/**
 * @typedef {ViewContext & { archivesPage: ArchivesPageState }} ArchivesPageContext
 */

/**
 * @type {FragtmlTemplate<ArchivesPageContext, AppLayoutName, AppFragmentId>}
 */
export const archivesPage = (context) => html/* html */`
  <div class="bc-archives-page">
    <h1>Archives</h1>
    <form class="bc-search-form" method="get" action="/search/archives/">
      <input type="search" name="query" placeholder="Search archives" autocomplete="off" aria-label="Search archives">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${context.archivesPage.filters.bookmarkId
      ? html/* html */`
        <div class="bc-active-filter">
          Bookmark filter active
          <a href="${archivesUrl(context, { bookmarkId: null })}">remove</a>
        </div>
      `
      : null}
    ${paginationControls(context)}
    <div class="${context.archivesPage.archives.length === 0 ? 'bc-archives-results bc-archives-results-empty' : 'bc-archives-results'}">
      ${context.archivesPage.archives.length > 0
        ? context.archivesPage.archives.map(archive => html/* html */`
          <div class="bc-archive">
            ${archiveArticle(archive, { redirectPath: context.currentPath })}
          </div>
        `)
        : html`<div class="bc-archives-empty">Bookmark some articles.</div>`}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @param {ArchivesPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.archivesPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Archives pagination">
      <div class="pagination-buttons-nav">
        ${pagination.before
          ? html`<a class="pagination-button" href="${archivesUrl(context, { before: pagination.before, after: null })}">earlier</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`}
        ${pagination.after
          ? html`<a class="pagination-button" href="${archivesUrl(context, { after: pagination.after, before: null })}">later</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {ArchivesPageContext} context
 * @param {object} changes
 * @param {Date | null} [changes.before]
 * @param {Date | null} [changes.after]
 * @param {string | null} [changes.bookmarkId]
 * @returns {string}
 */
function archivesUrl (context, changes) {
  const params = new URLSearchParams(context.archivesPage.filters.queryString)

  if ('before' in changes) {
    if (changes.before) params.set('before', String(changes.before.valueOf()))
    else params.delete('before')
  }

  if ('after' in changes) {
    if (changes.after) params.set('after', String(changes.after.valueOf()))
    else params.delete('after')
  }

  if ('bookmarkId' in changes) {
    if (changes.bookmarkId) params.set('bid', changes.bookmarkId)
    else {
      params.delete('bid')
      params.delete('bookmark_id')
    }
  }

  const query = params.toString()
  return query ? `/archives/?${query}` : '/archives/'
}
