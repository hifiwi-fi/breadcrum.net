/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import format from 'format-duration'

import { textIcon } from '../text-icon/index.js'
import { episodeTitle } from '../episode-title/index.js'
import { corsMedia } from '../cors-media/cors-media.js'
import { ExpandText } from '../expand-text/index.js'

export const episodeView = Component(({
  episode: e,
  clickForPreview,
  onEdit = () => {},
} = {}) => {
  const mediaLink = e?.podcast_feed_id && e?.id ? `/api/feeds/${e?.podcast_feed_id}/episode/${e.id}` : null

  return html`
    <div class="bc-episode-view">

      ${episodeTitle({ episode: e })}

      <div class="bc-episode-url-display">
        <a href="${e.url}">${e.url}</a>
      </div>


      ${corsMedia({ id: e?.id, src: mediaLink, type: e?.src_type, clickForPreview, thumbnail: e?.thumbnail })}

      ${
        e?.ready
        ? html`
          <div class="bc-episode-details-display">
            <div>
              ${e.src_type === 'video' ? ' 📼' : e.src_type === 'audio' ? ' 💿' : null}
              ${e.src_type && e.ext ? html`<code>${e.src_type}/${e.ext}</code>` : null}
              ${e.duration_in_seconds ? ` (${format(e.duration_in_seconds * 1000)}) ` : null}
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
        ? html`<div>${textIcon({ value: 'Explicit' })}</div>`
        : null
      }

      ${
        e?.text_content // Watch your whitepsace here
          ? html`
            ${ExpandText({
              children: e?.text_content,
              pre: true,
            })}
          `
          : null
      }

      <div class="bc-date">
        <a href="${`/episodes/view/?id=${e.id}`}">
          <time datetime="${e.created_at}">
            ${(new Date(e.created_at)).toLocaleString()}
          </time>
        </a>
      </div>

      ${e.error
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
})
