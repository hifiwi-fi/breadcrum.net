/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 */

import { html } from 'htm/preact'
import { archiveTitle } from '../archive-title/index.js'
import { expandText } from '../expand-text/index.js'

/** @type {FunctionComponent<{
 * archive: TypeArchiveReadClient & {
 *   bookmark: { id: string, title: string },
 *   error?: string
 * },
 * onEdit?: () => void, // TODO: Add when editing is supported
 * fullView?: boolean
}>} */
export const archiveView = ({
  archive: ar,
  onEdit = () => {}, // TODO: Add when editing is supported
  fullView,
}) => {
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

      ${
        ar?.excerpt && !fullView
          ? html`
            <div class="bc-archive-excerpt">
              ${expandText({
                children: ar?.excerpt,
              })}
            </div>
          `
          : null
      }

      <div class="bc-date">
        <a href="${`/archives/view/?id=${ar.id}`}">
          <time datetime="${ar.created_at}">
            ${(new Date(ar.created_at)).toLocaleString()}
          </time>
        </a>
      </div>

      <!-- TODO: Add Edit button when editing is supported
      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
      -->


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
            ${html(Object.assign([ar?.html_content], { raw: [ar?.html_content] }))}
          </div>
        `
        : ar?.text_content // Watch your whitepsace here
          ? html`
            <div class="bc-archive-text-content">${ar?.text_content}</div>
          `
          : null
      }
    </div>
  `
}
