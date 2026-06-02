/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeArchiveRead } from '../../api/archives/schemas/schema-archive-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { ArchiveEditFormState } from '../archive.view.js'
 */

import html from 'fragtml'
import { archiveArticle, archiveEditForm } from '../archive.view.js'

/**
 * @typedef {object} ArchiveViewPageState
 * @property {TypeArchiveRead | null} archive
 * @property {string | null} error
 * @property {boolean} edit
 * @property {ArchiveEditFormState | null} editForm
 */

/**
 * @typedef {ViewContext & { archiveViewPage: ArchiveViewPageState }} ArchiveViewPageContext
 */

/**
 * @type {FragtmlTemplate<ArchiveViewPageContext, AppLayoutName, AppFragmentId>}
 */
export const archiveViewPage = (context) => html/* html */`
  <div class="bc-archive-page">
    <form class="bc-search-form" method="get" action="/search/archives/">
      <input type="search" name="query" placeholder="Search archives" autocomplete="off" aria-label="Search archives">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${context.archiveViewPage.error
      ? html`<div class="bc-form-errors" role="alert"><p>${context.archiveViewPage.error}</p></div>`
      : null}
    ${context.archiveViewPage.archive && context.archiveViewPage.edit && context.archiveViewPage.editForm
      ? archiveEditForm(context.archiveViewPage.editForm)
      : context.archiveViewPage.archive
        ? archiveArticle(context.archiveViewPage.archive, {
            fullView: true,
            redirectPath: context.currentPath,
            deleteRedirectPath: `/bookmarks/view/?id=${context.archiveViewPage.archive.bookmark.id}`,
          })
        : null}
  </div>
`
