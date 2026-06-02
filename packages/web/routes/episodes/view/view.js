/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { TypeEpisodeRead } from '../../api/episodes/schemas/schema-episode-read.js'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { EpisodeEditFormState } from '../episode.view.js'
 */

import html from 'fragtml'
import { episodeArticle, episodeEditForm } from '../episode.view.js'

/**
 * @typedef {object} EpisodeViewPageState
 * @property {TypeEpisodeRead | null} episode
 * @property {string | null} error
 * @property {boolean} edit
 * @property {EpisodeEditFormState | null} editForm
 */

/**
 * @typedef {ViewContext & { episodeViewPage: EpisodeViewPageState }} EpisodeViewPageContext
 */

/**
 * @type {FragtmlTemplate<EpisodeViewPageContext, AppLayoutName, AppFragmentId>}
 */
export const episodeViewPage = (context) => html/* html */`
  <div class="bc-episode-page">
    <form class="bc-search-form" method="get" action="/search/episodes/">
      <input type="search" name="query" placeholder="Search episodes" autocomplete="off" aria-label="Search episodes">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${context.episodeViewPage.error
      ? html`<div class="bc-form-errors" role="alert"><p>${context.episodeViewPage.error}</p></div>`
      : null}
    ${context.episodeViewPage.episode && context.episodeViewPage.edit && context.episodeViewPage.editForm
      ? episodeEditForm(context.episodeViewPage.editForm)
      : context.episodeViewPage.episode
        ? episodeArticle(context.episodeViewPage.episode, {
            fullView: true,
            showError: true,
            redirectPath: context.currentPath,
            deleteRedirectPath: `/bookmarks/view/?id=${context.episodeViewPage.episode.bookmark.id}`,
          })
        : null}
  </div>
`
