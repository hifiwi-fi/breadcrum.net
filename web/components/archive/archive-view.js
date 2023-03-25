/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'

import { archiveEntry } from '../archive-entry/index.js'

export const archiveView = Component(({
  archive: ar,
  onEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-archive-view">

      ${archiveEntry({ archive: ar })}

      <div class="bc-archive-url-display">
        <a href="${ar.url}">${ar.url}</a>
      </div>

      <div class="bc-archive-bookmark-title">
        🔖
        <a class="bc-archive-bookmark-title-text" href="${`/bookmarks/view/?id=${ar.bookmark.id}`}">
          ${ar.bookmark.title}
        </a>
      </div>

      <div class="bc-date">
        <a href="${`/archives/view/?id=${ar.id}`}">
          <time datetime="${ar.created_at}">
            ${(new Date(ar.created_at)).toLocaleString()}
          </time>
        </a>
      </div>

      ${ar.error
        ? html`
        <details class="bc-archive-error-box">
          <summary>Error</summary>
          <pre>${ar.error}</pre>
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
