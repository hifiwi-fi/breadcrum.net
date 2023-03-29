/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'

import { archiveTitle } from '../archive-title/index.js'

export const archiveView = Component(({
  archive: ar,
  onEdit = () => {},
  fullView
} = {}) => {
  return html`
    <div class="bc-archive-view">

      ${archiveTitle({ archive: ar, big: fullView })}

      <div class="bc-archive-url-display">
        ${fullView ? '🗄️ ' : ''}<a href="${ar.url}">${ar.site_name || ar.url.replace(/^https?:\/\//, '')}</a>${ar.byline ? ` · ${ar.byline}` : null}
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

      ${
        ar?.html_content
        ? html`
          <div class="bc-archive-html-content">
            ${html([ar?.html_content])}
          </div>
        `
        : null
      }
    </div>
  `
})
