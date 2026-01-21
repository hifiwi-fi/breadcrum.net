/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 */

import { html } from 'htm/preact'
import format from 'format-duration'
import { TextIcon } from '../text-icon/index.js'
import { EpisodeTitle } from '../episode-title/index.js'
import { CorsMedia } from '../cors-media/cors-media.js'
import { ExpandText } from '../expand-text/index.js'
import { tc } from '../../lib/typed-component.js'

/**
 * @typedef {object} EpisodeViewProps
 * @property {TypeEpisodeReadClient} episode
 * @property {boolean | undefined} [clickForPreview]
 * @property {() => void} [onEdit]
 * @property {boolean} [showError]
 */

/**
 * @type {FunctionComponent<EpisodeViewProps>}
 */
export const EpisodeView = ({
  episode: e,
  clickForPreview,
  onEdit = () => {},
  showError = false,
}) => {
  const mediaLink = e?.podcast_feed_id && e?.id ? `/api/feeds/${e?.podcast_feed_id}/episode/${e.id}` : null

  return html`
    <div class="bc-episode-view">

      <${EpisodeTitle} episode=${e} />

      <div class="bc-episode-url-display">
        <a href="${e.url}">${e.url}</a>
      </div>

      ${mediaLink && e?.src_type
        ? tc(CorsMedia, {
                src: mediaLink,
                type: e.src_type,
                ...(clickForPreview !== undefined && { clickForPreview }),
                ...(e?.thumbnail && { thumbnail: e.thumbnail })
              })
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
    </div>
  `
}
