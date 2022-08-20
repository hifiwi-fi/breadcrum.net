/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import format from 'format-duration'

export const episodeView = Component(({
  episode: e,
  onEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-episode-view">

      <div>
        <a class="bc-episode-title" href="${e.bookmark.url}" target="_blank">
          ${e.bookmark.title}
        </a>
      </div>

      <div class="bc-episode-url-display">
        <a href="${e.bookmark.url}">${e.bookmark.url}</a>
      </div>

      <div class="bc-episode-details-display">
        <div>${e.filename ? e.filename : null}${e.duration_in_seconds ? ` - ${format(e.duration_in_seconds * 1000)}` : null}${e.ready ? e.src_type === 'video' ? ' (📼)' : ' (🎧)' : null}${e.error ? ' (❌)' : null}</div>
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
