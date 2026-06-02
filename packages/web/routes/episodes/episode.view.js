/**
 * @import { TypeEpisodeRead } from '../api/episodes/schemas/schema-episode-read.js'
 * @import { FormError } from '#lib/htmx.js'
 */

import html, { raw } from 'fragtml'

const RESOLVE_TIMEOUT_MS = 5 * 60 * 60 * 1000

/**
 * @typedef {object} EpisodeEditFormState
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {boolean} explicit
 * @property {string} redirect
 * @property {FormError[]} errors
 */

/**
 * @param {TypeEpisodeRead} episode
 * @param {object} [options]
 * @param {boolean} [options.fullView]
 * @param {boolean} [options.showError]
 * @param {string} [options.redirectPath]
 * @param {string} [options.deleteRedirectPath]
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function episodeArticle (episode, options = {}) {
  const createdAt = toDate(episode.created_at)
  const title = episode.display_title || episode.title || episode.bookmark?.title || episode.url
  const fullView = Boolean(options.fullView)
  const mediaLink = episode.podcast_feed_id && episode.id
    ? `/api/feeds/${episode.podcast_feed_id}/episode/${episode.id}`
    : null
  const embedHtml = embedHtmlWithCredentialless(episode.oembed?.html)
  const embedProviderName = typeof episode.oembed?.provider_name === 'string' ? episode.oembed.provider_name : ''
  const embedAspectRatio = getEmbedAspectRatio(episode.oembed)
  const embedStyle = embedAspectRatio ? `--bc-embed-aspect: ${embedAspectRatio}` : ''
  const isResolving = withinResolvingWindow(episode.created_at) && episode.ready === false && !episode.error

  return html/* html */`
    <article
      id="bc-episode-${episode.id}"
      class="bc-episode-view"
      ${isResolving
        ? html`hx-get="${episodeFragmentUrl(episode, options.redirectPath ?? '/episodes/')}" hx-trigger="every 5s" hx-target="#bc-episode-${episode.id}" hx-swap="outerHTML"`
        : null}
    >
      <div class="bc-episode-title-container">
        <span class="bc-status-token">${episode.error ? 'Error' : episode.ready ? 'Ready' : 'Resolving'}</span>
        ${episode.type ? html`<span class="bc-status-token">${episode.type}</span>` : null}
        ${episode.medium ? html`<span class="bc-status-token">${episode.medium}</span>` : null}
        <a href="${fullView ? episode.url : `/episodes/view/?id=${episode.id}`}">${title}</a>
      </div>

      ${episode.url ? html`<div class="bc-bookmark-url-display"><a href="${episode.url}" rel="noreferrer">${displayUrl(episode.url)}</a></div>` : null}

      ${embedHtml
        ? html/* html */`
          <div class="${embedClassName(episode)}" data-bc-embed-provider="${embedProviderName}">
            <template data-bc-embed-template>
              ${raw(embedHtml)}
            </template>
            <button class="bc-episode-embed-activate" style="${embedStyle}" type="button" data-bc-embed-activate>
              ${episode.thumbnail ? html`<img src="${episode.thumbnail}" alt="" class="bc-episode-embed-activate-thumb">` : null}
              <span class="bc-episode-embed-activate-label">Load ${embedProviderName || 'embed'}</span>
            </button>
          </div>
        `
        : mediaLink && episode.src_type
          ? mediaPreview({ src: mediaLink, type: episode.src_type, thumbnail: episode.thumbnail, clickForPreview: !fullView })
          : null}

      ${embedHtml && mediaLink && episode.src_type && fullView
        ? html/* html */`
          <details class="bc-episode-media-fallback">
            <summary>Preview original media</summary>
            ${mediaPreview({ src: mediaLink, type: episode.src_type, thumbnail: episode.thumbnail, clickForPreview: true })}
          </details>
        `
        : null}

      ${episode.ready
        ? html/* html */`
          <div class="bc-episode-details-display">
            ${episode.src_type && episode.ext ? html`<code>${episode.src_type}/${episode.ext}</code>` : null}
            ${episode.duration_in_seconds ? html`<span>${formatDuration(episode.duration_in_seconds)}</span>` : null}
            ${mediaLink ? html`<a href="${mediaLink}">${episode.filename || 'Media file'}</a>` : null}
          </div>
        `
        : isResolving
          ? html`<div class="bc-resolve-status">Resolving episode media.</div>`
          : null}

      ${episode.bookmark
        ? html/* html */`
          <div class="bc-episode-bookmark-title">
            Bookmark:
            <a class="bc-episode-bookmark-title-text" href="/bookmarks/view/?id=${episode.bookmark.id}">
              ${episode.bookmark.title || episode.bookmark.url}
            </a>
          </div>
        `
        : null}

      ${episode.podcast_feed
        ? html/* html */`
          <div class="bc-episode-feed-title">
            Feed:
            <a class="bc-episode-feed-title-text" href="${episode.podcast_feed.default_feed ? '/feeds/' : `/feeds/?feed_id=${episode.podcast_feed.id}`}">
              ${episode.podcast_feed.title}
            </a>
          </div>
        `
        : null}

      ${episode.explicit ? html`<div class="bc-status-token bc-status-token-warning">Explicit</div>` : null}
      ${episode.text_content ? html`<pre class="bc-episode-text-content">${episode.text_content}</pre>` : null}

      ${createdAt
        ? html/* html */`
          <div class="bc-date">
            <a href="/episodes/view/?id=${episode.id}">
              <time datetime="${createdAt.toISOString()}">${createdAt.toLocaleString()}</time>
            </a>
          </div>
        `
        : null}

      ${options.showError && episode.error
        ? html/* html */`
          <details class="bc-episode-error-box">
            <summary>Error</summary>
            <pre>${episode.error}</pre>
          </details>
        `
        : null}

      <div class="bc-row-actions">
        <a href="/episodes/view/?id=${episode.id}">View</a>
        <a href="/episodes/view/?id=${episode.id}&amp;edit=true">Edit</a>
        ${deleteForm(episode, options.deleteRedirectPath ?? options.redirectPath ?? '/episodes/')}
      </div>

      ${fullView ? episodeFooter(episode) : null}
    </article>
  `
}

/**
 * @param {EpisodeEditFormState} form
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
export function episodeEditForm (form) {
  return html/* html */`
    <article id="bc-episode-${form.id}" class="bc-episode-edit">
      ${form.errors.length > 0
        ? html/* html */`
          <div class="bc-form-errors" role="alert">
            ${form.errors.map(error => html`<p>${error.message}</p>`)}
          </div>
        `
        : null}
      <form
        method="post"
        action="/episodes/view/"
        hx-post="/episodes/view/"
        hx-target="#bc-episode-${form.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${form.id}">
        <input type="hidden" name="redirect" value="${form.redirect}">
        <fieldset>
          <legend class="bc-episode-legend">Edit episode</legend>
          <label class="bc-field">
            <span>URL</span>
            <input disabled type="url" name="url" value="${form.url}">
          </label>
          <label class="bc-field">
            <span>Title</span>
            <input type="text" name="title" value="${form.title}" maxlength="255">
          </label>
          <label class="bc-checkbox-field">
            <input type="checkbox" name="explicit" value="true" ${form.explicit ? html`checked` : null}>
            <span>Explicit</span>
          </label>
          <div class="bc-form-actions">
            <button class="bc-button bc-button-primary" type="submit">Save episode</button>
            <a class="bc-button" href="/episodes/view/?id=${form.id}">Cancel</a>
          </div>
        </fieldset>
      </form>
      ${deleteForm({ id: form.id }, form.redirect)}
    </article>
  `
}

/**
 * @param {TypeEpisodeRead} episode
 * @returns {EpisodeEditFormState}
 */
export function episodeEditFormFromEpisode (episode) {
  return {
    id: episode.id ?? '',
    url: episode.url ?? '',
    title: episode.title || episode.display_title || episode.bookmark?.title || '',
    explicit: Boolean(episode.explicit),
    redirect: `/episodes/view/?id=${episode.id}`,
    errors: [],
  }
}

/**
 * @param {TypeEpisodeRead | { id: string }} episode
 * @param {string} redirectPath
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function deleteForm (episode, redirectPath) {
  return html/* html */`
    <details class="bc-delete-details">
      <summary>Delete</summary>
      <form
        method="post"
        action="/episodes/delete/"
        hx-post="/episodes/delete/"
        hx-target="#bc-episode-${episode.id}"
        hx-swap="outerHTML"
      >
        <input type="hidden" name="id" value="${episode.id}">
        <input type="hidden" name="redirect" value="${redirectPath}">
        <button class="bc-button" type="submit">Delete episode</button>
      </form>
    </details>
  `
}

/**
 * @param {object} params
 * @param {string} params.src
 * @param {string} params.type
 * @param {string | undefined} params.thumbnail
 * @param {boolean} params.clickForPreview
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function mediaPreview ({ src, type, thumbnail, clickForPreview }) {
  if (!['video', 'audio'].includes(type)) {
    return html`<a href="${src}">View media</a>`
  }

  return html/* html */`
    <div class="bc-cors-media" data-bc-media-container>
      ${clickForPreview
        ? html/* html */`
          <button
            class="bc-cors-media-activate"
            type="button"
            data-bc-media-activate
            data-bc-media-src="${src}"
            data-bc-media-type="${type}"
            data-bc-media-thumbnail="${thumbnail ?? ''}"
          >
            ${thumbnail ? html`<img src="${thumbnail}" alt="" class="bc-cors-media-activate-thumb">` : null}
            <span class="bc-cors-media-activate-label">Play ${type}</span>
          </button>
        `
        : mediaElement({ src, type, thumbnail })}
      <noscript><a href="${src}">View ${type}</a></noscript>
    </div>
  `
}

/**
 * @param {object} params
 * @param {string} params.src
 * @param {string} params.type
 * @param {string | undefined} params.thumbnail
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function mediaElement ({ src, type, thumbnail }) {
  return type === 'video'
    ? html/* html */`
      <video class="bc-cors-video" controls src="${src}" preload="none" poster="${thumbnail ?? ''}" data-bc-cors-media>
        <a href="${src}">View video</a>
      </video>
    `
    : html/* html */`
      <audio class="bc-cors-audio" controls src="${src}" preload="none" data-bc-cors-media>
        <a href="${src}">View audio</a>
      </audio>
    `
}

/**
 * @param {TypeEpisodeRead} episode
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function episodeFooter (episode) {
  const rows = [
    [
      { label: 'MIME', value: episode.mime_type ? html`<code>${episode.mime_type}</code>` : null },
      { label: 'Size', value: episode.size_in_bytes != null ? `${episode.size_in_bytes.toLocaleString()} bytes` : null },
      { label: 'Medium', value: episode.medium ?? null },
    ],
    [
      { label: 'Author', value: authorValue(episode) },
      { label: 'Embed provider', value: episode.oembed?.provider_name ?? null },
      { label: 'Embed type', value: episode.oembed?.type ?? null },
    ],
    [
      { label: 'Ready', value: typeof episode.ready === 'boolean' ? (episode.ready ? 'yes' : 'no') : null },
      { label: 'Published', value: formatDate(episode.published_time) },
      { label: 'Created', value: formatDate(episode.created_at) },
      { label: 'Updated', value: formatDate(episode.updated_at) },
    ],
  ].map(row => row.filter(item => item.value != null && item.value !== ''))
    .filter(row => row.length > 0)

  if (rows.length === 0) return null

  return html/* html */`
    <div class="bc-episode-footer">
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
 * @param {TypeEpisodeRead} episode
 * @returns {string | import('fragtml/types.js').HtmlRenderable | null}
 */
function authorValue (episode) {
  if (!episode.author_name) return null
  return episode.author_url
    ? html`<a href="${episode.author_url}" rel="noreferrer">${episode.author_name}</a>`
    : episode.author_name
}

/**
 * @param {TypeEpisodeRead} episode
 * @returns {string}
 */
function embedClassName (episode) {
  const providerName = typeof episode.oembed?.provider_name === 'string' ? episode.oembed.provider_name.toLowerCase() : ''
  const providerUrl = typeof episode.oembed?.provider_url === 'string' ? episode.oembed.provider_url.toLowerCase() : ''

  if (providerName === 'soundcloud' || providerUrl.includes('soundcloud.com')) return 'bc-episode-embed bc-episode-embed--soundcloud'
  if (providerName === 'twitter' || providerUrl.includes('twitter.com') || providerUrl.includes('x.com')) return 'bc-episode-embed bc-episode-embed--twitter'
  if (providerName === 'bluesky social' || providerName === 'bluesky' || providerUrl.includes('bsky.app')) return 'bc-episode-embed bc-episode-embed--bluesky'
  return 'bc-episode-embed'
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function normalizeEmbedDimension (value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/**
 * @param {TypeEpisodeRead['oembed'] | undefined | null} oembed
 * @returns {string | null}
 */
function getEmbedAspectRatio (oembed) {
  const width = normalizeEmbedDimension(oembed?.width)
  const height = normalizeEmbedDimension(oembed?.height)
  if (!width || !height) return null
  if (width <= 0 || height <= 0) return null
  return `${width} / ${height}`
}

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function embedHtmlWithCredentialless (value) {
  if (!value) return null
  return value.replace(/<iframe\b(?![^>]*\bcredentialless\b)/gi, '<iframe credentialless')
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
 * @param {TypeEpisodeRead} episode
 * @param {string} redirectPath
 * @returns {string}
 */
function episodeFragmentUrl (episode, redirectPath) {
  const params = new URLSearchParams({
    id: episode.id ?? '',
    fragment: 'episode',
    redirect: redirectPath,
  })

  return `/episodes/view/?${params.toString()}`
}

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration (seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
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
