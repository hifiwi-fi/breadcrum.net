/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { FeedDetails, FeedListItem } from '../api/feeds/feed-actions.js'
 * @import { FormError } from '#lib/htmx.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} FeedEditFormState
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {boolean} explicit
 * @property {FormError[]} errors
 */

/**
 * @typedef {object} FeedsPageState
 * @property {FeedListItem[]} feeds
 * @property {FeedDetails | null} feed
 * @property {boolean} edit
 * @property {FeedEditFormState | null} editForm
 * @property {string | null} error
 */

/**
 * @typedef {ViewContext & { feedsPage: FeedsPageState }} FeedsPageContext
 */

/**
 * @type {FragtmlTemplate<FeedsPageContext, AppLayoutName, AppFragmentId>}
 */
export const feedsPage = (context) => html/* html */`
  <div class="bc-feeds-page">
    <h1>Feeds</h1>
    <form class="bc-search-form" method="get" action="/search/episodes/">
      <input type="search" name="query" placeholder="Search feed episodes" autocomplete="off" aria-label="Search feed episodes">
      <button class="bc-button" type="submit">Search</button>
    </form>
    ${feedList(context)}
    ${context.feedsPage.error ? html`<div class="bc-form-errors" role="alert"><p>${context.feedsPage.error}</p></div>` : null}
    ${context.feedsPage.feed
      ? context.feedsPage.edit && context.feedsPage.editForm
        ? feedEditForm(context.feedsPage.editForm)
        : feedDisplay(context.feedsPage.feed)
      : html`<div class="bc-feeds-empty">No feed found.</div>`}
  </div>
`

/**
 * @param {FeedsPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function feedList (context) {
  if (context.feedsPage.feeds.length === 0) return null

  return html/* html */`
    <nav class="bc-feed-list" aria-label="Podcast feeds">
      ${context.feedsPage.feeds.map(feed => html/* html */`
        <a href="/feeds/?feed_id=${feed.id}" ${context.feedsPage.feed?.id === feed.id ? html`aria-current="page"` : null}>
          ${feed.title}${feed.default_feed ? ' (default)' : ''}<sup>${feed.episode_count ?? 0}</sup>
        </a>
      `)}
    </nav>
  `
}

/**
 * @param {FeedDetails} feed
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function feedDisplay (feed) {
  return html/* html */`
    <section class="bc-feed-display">
      <div class="bc-feed-info">
        <div class="bc-feed-image">
          <img width="100" height="100" src="${feed.image_url}" alt="">
        </div>
        <h2 class="bc-feed-title">${feed.title}</h2>
        <div class="bc-feed-icon-button-line">
          ${feed.default_feed ? html`<span class="bc-text-icon">Default</span>` : null}
          ${feed.explicit ? html`<span class="bc-text-icon">Explicit</span>` : null}
          <a href="/feeds/?feed_id=${feed.id}&amp;edit=true">Edit</a>
        </div>
        <div class="bc-feed-description">
          ${paragraphs(feed.description)}
        </div>
        <div class="bc-feed-feed-url-line">
          <a href="/api/feeds/${feed.id}?format=json">JSON</a>
          <a href="/api/feeds/${feed.id}?format=rss">RSS</a>
          <input class="bc-feed-header-select" type="text" readonly value="${feed.feed_url}" aria-label="Feed URL">
        </div>
        <div class="bc-help-text bc-feed-header-help-text">
          Subscribe to this RSS feed in a podcast client that supports video podcasts.
        </div>
      </div>
    </section>
  `
}

/**
 * @param {FeedEditFormState} form
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function feedEditForm (form) {
  return html/* html */`
    <section class="bc-feed-edit">
      <form class="bc-feed-edit-form" method="post" action="/feeds/update/">
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
            <span>Title</span>
            <input type="text" name="title" maxlength="255" required value="${form.title}">
          </label>
          <label class="bc-field">
            <span>Description</span>
            <textarea name="description" rows="6" maxlength="30000">${form.description}</textarea>
          </label>
          <label class="bc-field">
            <span>Image URL</span>
            <input type="url" name="imageUrl" value="${form.imageUrl}">
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="explicit" value="true" ${form.explicit ? html`checked` : null}>
            <span>Explicit</span>
          </label>
          <div class="bc-form-actions">
            <button class="bc-button bc-button-primary" type="submit">Save feed</button>
            <a href="/feeds/?feed_id=${form.id}">Cancel</a>
          </div>
        </fieldset>
      </form>
    </section>
  `
}

/**
 * @param {FeedDetails} feed
 * @returns {FeedEditFormState}
 */
export function feedEditFormFromFeed (feed) {
  return {
    id: feed.id,
    title: feed.title,
    description: feed.description,
    imageUrl: feed.image_url ?? '',
    explicit: Boolean(feed.explicit),
    errors: [],
  }
}

/**
 * @param {string} value
 * @returns {import('fragtml/types.js').HtmlRenderable[]}
 */
function paragraphs (value) {
  return value.trim().split(/\n\n+/).map(paragraph => html`<p>${paragraph}</p>`)
}
