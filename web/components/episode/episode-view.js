/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import format from 'format-duration'

import { textIcon } from '../text-icon/index.js'
import { episodeTitle } from '../episode-title/index.js'

export const episodeView = Component(({
  episode: e,
  onEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-episode-view">

      ${episodeTitle({ episode: e })}

      <div class="bc-episode-url-display">
        <a href="${e.url}">${e.url}</a>
      </div>

      ${
        e.ready
        ? html`
          <div class="bc-episode-details-display">
            <div>
              ${e.src_type === 'video' ? ' 📼' : e.src_type === 'audio' ? ' 💿' : null}
              ${e.src_type && e.ext ? html`<code>${e.src_type}/${e.ext}</code>` : null}
              ${e.duration_in_seconds ? ` (${format(e.duration_in_seconds * 1000)}) ` : null}
              ${e.filename ? e.filename : null}
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
            <a class="bc-episode-feed-title-text" href="${e.podcast_feed.default_feed ? '/feeds/' : `/feeds/?feed_id=${e.podcast_feed.id}`}" target="_blank">
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
