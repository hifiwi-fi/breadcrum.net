/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import format from 'format-duration'

import { textIcon } from '../text-icon/index.js'

export const episodeView = Component(({
  episode: e,
  onEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-episode-view">

      <div>
        ${
          e.ready ? '✅' : '⏱'
        }
        ${
          e.error ? '❌' : null
        }
        ${e.type === 'redirect'
          ? '☁️'
          : e.type === 'raw'
            ? '🍣'
            : e.type === 'b2_file'
              ? '🗄'
              : null
        }
        ${
          e.medium === 'video'
            ? '📼'
            : e.medium === 'audio'
              ? '💿'
              : null
        }
        <a class="bc-episode-title" href="${e.url}" target="_blank">
          ${e.display_title}
        </a>
      </div>

      <div class="bc-episode-url-display">
        <a href="${e.url}">${e.url}</a>
      </div>

      <div class="bc-episode-details-display">
        <div>
          ${e.explicit ? textIcon({ value: 'Explicit' }) : null}
          ${e.filename ? e.filename : null}
          ${e.duration_in_seconds ? ` - ${format(e.duration_in_seconds * 1000)}` : null}
          ${e.ready ? e.src_type === 'video' ? ' (📼)' : ' (🎧)' : null}
          ${e.error ? ' (❌)' : null}
        </div>
      </div>

      <div class="bc-date">
        <a href="${`/episodes/view/?id=${e.id}`}">
          <time datetime="${e.created_at}">
            ${(new Date(e.created_at)).toLocaleString()}
          </time>
        </a>
      </div>

      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
    </div>
  `
})
