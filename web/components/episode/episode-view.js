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
        ${e.explicit ? textIcon({ value: 'Explicit' }) : null}
        <a href="${e.url}">${e.url}</a>
      </div>

      <div class="bc-episode-details-display">
        <div>
          ${e.src_type === 'video' ? ' 📼' : ' 💿'}
          ${e.src_type && e.ext ? html`<code>${e.src_type}/${e.ext}</code>` : null}
          ${e.filename ? e.filename : null}
          ${e.duration_in_seconds ? ` - ${format(e.duration_in_seconds * 1000)}` : null}
        </div>
      </div>


      <div>
        🔖
        <a class="bc-episode-bookmark-title" href="${`/bookmarks/view/?id=${e.bookmark.id}`}" target="_blank">
          ${e.bookmark.title}
        </a>
      </div>

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
