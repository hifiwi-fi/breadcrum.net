/// <reference lib="dom" />

/**
 * @import { ComponentChild, FunctionComponent } from 'preact'
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 */

import { html } from 'htm/preact'
import format from 'format-duration'
import { useState, useCallback, useEffect, useRef } from 'preact/hooks'
import { TextIcon } from '../text-icon/index.js'
import { EpisodeTitle } from '../episode-title/index.js'
import { CorsMedia } from '../cors-media/cors-media.js'
import { ExpandText } from '../expand-text/index.js'
import { tc } from '../../lib/typed-component.js'

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
 * @param {TypeEpisodeReadClient['oembed'] | undefined | null} oembed
 * @returns {string | null}
 */
function getEmbedAspectRatio (oembed) {
  const width = normalizeEmbedDimension(oembed?.width)
  const height = normalizeEmbedDimension(oembed?.height)
  if (!width || !height) return null
  if (width <= 0 || height <= 0) return null
  return `${width} / ${height}`
}

/** @type {Promise<void> | null} */
let twitterWidgetsPromise = null

function loadTwitterWidgets () {
  if (twitterWidgetsPromise) return twitterWidgetsPromise
  twitterWidgetsPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && /** @type {any} */ (window).twttr?.widgets) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://platform.twitter.com/widgets.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Twitter widgets.js'))
    document.head.appendChild(script)
  })
  return twitterWidgetsPromise
}

/** @type {Promise<void> | null} */
let blueskyEmbedPromise = null

function loadBlueskyEmbed () {
  if (blueskyEmbedPromise) return blueskyEmbedPromise
  blueskyEmbedPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://embed.bsky.app/static/embed.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Bluesky embed.js'))
    document.head.appendChild(script)
  })
  return blueskyEmbedPromise
}

/**
 * @typedef {object} EpisodeViewProps
 * @property {TypeEpisodeReadClient} episode
 * @property {boolean | undefined} [clickForPreview]
 * @property {() => void} [onEdit]
 * @property {boolean} [showError]
 * @property {boolean} [fullView]
 */

/**
 * @type {FunctionComponent<EpisodeViewProps>}
 */
export const EpisodeView = ({
  episode: e,
  clickForPreview,
  onEdit = () => {},
  showError = false,
  fullView = false,
}) => {
  const mediaLink = e?.podcast_feed_id && e?.id ? `/api/feeds/${e?.podcast_feed_id}/episode/${e.id}` : null
  const rawEmbedHtml = typeof e?.oembed?.html === 'string' ? e.oembed.html : null
  const embedHtml = rawEmbedHtml ? rawEmbedHtml.replace(/<iframe /gi, '<iframe credentialless ') : null
  const embedAspectRatio = getEmbedAspectRatio(e?.oembed)
  const embedStyle = embedAspectRatio ? { '--bc-embed-aspect': embedAspectRatio } : undefined
  const embedProviderName = typeof e?.oembed?.provider_name === 'string' ? e.oembed.provider_name.toLowerCase() : ''
  const embedProviderUrl = typeof e?.oembed?.provider_url === 'string' ? e.oembed.provider_url.toLowerCase() : ''
  const isSoundCloud = embedProviderName === 'soundcloud' || embedProviderUrl.includes('soundcloud.com')
  const isTwitter = embedProviderName === 'twitter' || embedProviderUrl.includes('twitter.com') || embedProviderUrl.includes('x.com')
  const isBluesky = embedProviderName === 'bluesky social' || embedProviderName === 'bluesky' || embedProviderUrl.includes('bsky.app')
  const embedClassName = isSoundCloud
    ? 'bc-episode-embed bc-episode-embed--soundcloud'
    : isTwitter
      ? 'bc-episode-embed bc-episode-embed--twitter'
      : isBluesky
        ? 'bc-episode-embed bc-episode-embed--bluesky'
        : 'bc-episode-embed'
  const hasEmbed = Boolean(embedHtml)
  const [showPreview, setShowPreview] = useState(false)
  const [embedActivated, setEmbedActivated] = useState(false)
  const embedRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev)
  }, [setShowPreview])

  /** @param {string | Date | null | undefined} value */
  const formatDate = (value) => {
    if (!value) return null
    return (new Date(value)).toLocaleString()
  }

  /** @typedef {{ label: string, value: ComponentChild }} FooterItem */
  /** @type {FooterItem[][]} */
  const footerRows = []

  /** @param {FooterItem[]} row */
  const addFooterRow = (row) => {
    const filteredRow = row.filter(item => item.value != null && item.value !== '')
    if (filteredRow.length > 0) {
      footerRows.push(filteredRow)
    }
  }

  addFooterRow([
    { label: 'MIME', value: e.mime_type ? html`<code>${e.mime_type}</code>` : null },
    { label: 'Size', value: e.size_in_bytes != null ? e.size_in_bytes.toLocaleString() + ' bytes' : null },
    { label: 'Medium', value: e.medium ?? null },
  ])

  addFooterRow([
    {
      label: 'Author',
      value: e.author_name
        ? (e.author_url ? html`<a href="${e.author_url}">${e.author_name}</a>` : e.author_name)
        : null,
    },
  ])

  if (e.oembed) {
    addFooterRow([
      { label: 'Embed provider', value: e.oembed.provider_name ?? null },
      { label: 'Embed type', value: e.oembed.type ?? null },
    ])
  }

  addFooterRow([
    { label: 'Ready', value: typeof e.ready === 'boolean' ? (e.ready ? 'yes' : 'no') : null },
    { label: 'Published', value: formatDate(e.published_time) },
    { label: 'Created', value: formatDate(e.created_at) },
    { label: 'Updated', value: formatDate(e.updated_at) },
  ])

  const showFooter = Boolean(fullView && footerRows.length)

  useEffect(() => {
    if (!isTwitter || !embedHtml || !embedActivated || showPreview || !embedRef.current) return
    loadTwitterWidgets().then(() => {
      const twttr = /** @type {any} */ (window).twttr
      if (twttr?.widgets?.load) {
        twttr.widgets.load(embedRef.current)
      }
    }).catch(() => {})
  }, [isTwitter, embedHtml, embedActivated, showPreview])

  useEffect(() => {
    if (!isBluesky || !embedHtml || !embedActivated || showPreview || !embedRef.current) return
    loadBlueskyEmbed().then(() => {
      // Bluesky's embed.js scans for blockquote.bluesky-embed and replaces them with iframes
      // Trigger a re-scan of the embed container
      if (typeof window !== 'undefined' && /** @type {any} */ (window).bluesky?.scan) {
        /** @type {any} */ (window).bluesky.scan(embedRef.current)
      }
    }).catch(() => {})
  }, [isBluesky, embedHtml, embedActivated, showPreview])

  return html`
    <div class="bc-episode-view">

      <${EpisodeTitle} episode=${e} />

      <div class="bc-episode-url-display">
        <a href="${e.url}">${e.url}</a>
      </div>

      ${hasEmbed && !showPreview
        ? embedActivated
          ? html`
            <div class="${embedClassName}">
              <div ref=${embedRef} class="bc-episode-embed-html" style=${embedStyle} dangerouslySetInnerHTML="${{ __html: embedHtml }}" />
            </div>
          `
          : html`
            <div class="${embedClassName}">
              <button class="bc-episode-embed-activate" style=${embedStyle} type="button" onClick=${() => setEmbedActivated(true)}>
                ${e.thumbnail ? html`<img src="${e.thumbnail}" alt="" class="bc-episode-embed-activate-thumb" />` : null}
                <span class="bc-episode-embed-activate-label">Click to load ${e.oembed?.provider_name ?? 'embed'}</span>
              </button>
            </div>
          `
        : null}

      ${!hasEmbed || showPreview
        ? mediaLink && e?.src_type
          ? tc(CorsMedia, {
              src: mediaLink,
              type: e.src_type,
              ...(showPreview
                ? { clickForPreview: false }
                : (clickForPreview !== undefined ? { clickForPreview } : {})),
              ...(e?.thumbnail && { thumbnail: e.thumbnail })
            })
          : null
        : null}

      ${
        e?.ready
        ? html`
          <div class="bc-episode-details-display">
            <div>
              ${e.src_type === 'video' ? ' 📼' : e.src_type === 'audio' ? ' 💿' : null}
              ${'\n'}
              ${e.src_type && e.ext ? html`<code>${e.src_type}/${e.ext}</code>` : null}
              ${'\n'}
              ${e.duration_in_seconds ? ` (${format(e.duration_in_seconds * 1000)}) ` : null}
              ${'\n'}
              <a href="${mediaLink}">${e.filename ? e.filename : null}</a>
              ${hasEmbed
                ? html`
                  ${' '}
                  <button class="bc-episode-preview-toggle" type="button" onClick=${togglePreview}>
                    ${showPreview ? 'Show embed' : 'Preview original media'}
                  </button>
                `
                : null}
            </div>
          </div>
        `
        : null
      }


      <div class="bc-episode-bookmark-title">
        🔖
        <a class="bc-episode-bookmark-title-text" href="${`/bookmarks/view/?id=${e.bookmark.id}`}">
          ${e.bookmark.title}
        </a>
      </div>

      ${
        e.podcast_feed
          ? html`
          <div class="bc-episode-feed-title">
            📡
            <a class="bc-episode-feed-title-text" href="${e.podcast_feed.default_feed ? '/feeds/' : `/feeds/?feed_id=${e.podcast_feed.id}`}">
              ${e.podcast_feed.title}
            </a>
          </div>
          `
          : null
      }

      ${e.explicit
        ? html`<div><${TextIcon} value="Explicit" /></div>`
        : null
      }

      ${
        e?.text_content // Watch your whitespace here
          ? html`
            <${ExpandText} children=${e?.text_content} pre=${true} />
          `
          : null
      }

      <div class="bc-date">
        <a href="${`/episodes/view/?id=${e.id}`}">
          <time datetime="${e.created_at}">
            ${e.created_at ? (new Date(e.created_at)).toLocaleString() : ''}
          </time>
        </a>
      </div>

      ${showError && e.error
        ? html`
        <details class="bc-episode-error-box">
          <summary>Error</summary>
          <pre>${e.error}</pre>
        </details>
        `
        : null
      }

      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>

      ${showFooter
        ? html`
          <div class="bc-episode-footer">
            <div class="bc-episode-footer-grid">
              ${footerRows.map((row) => html`
                <div class="bc-episode-footer-row">
                  ${row.map((item) => html`
                    <div class="bc-episode-footer-item">
                      <span class="bc-episode-footer-label">${item.label}</span>
                      <span class="bc-episode-footer-value">${item.value}</span>
                    </div>
                  `)}
                </div>
              `)}
            </div>
          </div>
        `
        : null}
    </div>
  `
}
