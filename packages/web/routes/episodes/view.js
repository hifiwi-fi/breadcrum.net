/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { EpisodeFilters, EpisodePagination } from './episodes-page-data.js'
 * @import { TypeEpisodeRead } from '../api/episodes/schemas/schema-episode-read.js'
 */

import html from 'fragtml'
import { episodeArticle } from './episode.view.js'

/**
 * @typedef {object} EpisodesPageState
 * @property {TypeEpisodeRead[]} episodes
 * @property {EpisodePagination} pagination
 * @property {EpisodeFilters} filters
 */

/**
 * @typedef {ViewContext & { episodesPage: EpisodesPageState }} EpisodesPageContext
 */

/**
 * @type {FragtmlTemplate<EpisodesPageContext, AppLayoutName, AppFragmentId>}
 */
export const episodesPage = (context) => html/* html */`
  <div class="bc-episodes-page">
    <h1>Episodes</h1>
    <form class="bc-search-form" method="get" action="/search/episodes/">
      <input type="search" name="query" placeholder="Search episodes" autocomplete="off" aria-label="Search episodes">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${context.episodesPage.filters.bookmarkId
      ? html/* html */`
        <div class="bc-active-filter">
          Bookmark filter active
          <a href="${episodesUrl(context, { bookmarkId: null })}">remove</a>
        </div>
      `
      : null}
    ${paginationControls(context)}
    <div class="${context.episodesPage.episodes.length === 0 ? 'bc-episodes-results bc-episodes-results-empty' : 'bc-episodes-results'}">
      ${context.episodesPage.episodes.length > 0
        ? context.episodesPage.episodes.map(episode => html/* html */`
          <div class="bc-episode">
            ${episodeArticle(episode, { redirectPath: context.currentPath })}
          </div>
        `)
        : html`<div class="bc-episodes-empty">Bookmark some media.</div>`}
    </div>
    ${paginationControls(context)}
  </div>
`

/**
 * @param {EpisodesPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function paginationControls (context) {
  const { pagination } = context.episodesPage

  return html/* html */`
    <nav class="pagination-buttons" aria-label="Episodes pagination">
      <div class="pagination-buttons-nav">
        ${pagination.before
          ? html`<a class="pagination-button" href="${episodesUrl(context, { before: pagination.before, after: null })}">earlier</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`}
        ${pagination.after
          ? html`<a class="pagination-button" href="${episodesUrl(context, { after: pagination.after, before: null })}">later</a>`
          : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`}
      </div>
    </nav>
  `
}

/**
 * @param {EpisodesPageContext} context
 * @param {object} changes
 * @param {Date | null} [changes.before]
 * @param {Date | null} [changes.after]
 * @param {string | null} [changes.bookmarkId]
 * @returns {string}
 */
function episodesUrl (context, changes) {
  const params = new URLSearchParams(context.episodesPage.filters.queryString)

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
  return query ? `/episodes/?${query}` : '/episodes/'
}
