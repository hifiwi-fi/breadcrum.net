/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 */

import { html } from 'htm/preact'
import { ArchiveTitle } from '../archive-title/index.js'
import { ExpandText } from '../expand-text/index.js'

/** @type {FunctionComponent<{
 * archive: TypeArchiveReadClient,
 * onEdit?: () => void, // TODO: Add when editing is supported
 * fullView?: boolean
}>} */
export const ArchiveView = ({
  archive: ar,
  onEdit = () => {}, // TODO: Add when editing is supported
  fullView,
}) => {
  return html`
    <div class="bc-archive-view">

      <${ArchiveTitle} archive=${ar} big=${!!fullView} />

      <div class="bc-archive-url-display">
        ${fullView ? '🗄️ ' : ''}<a href="${ar.url}">${ar.site_name || ar.url.replace(/^https?:\/\//, '')}</a>${ar.byline ? ` · ${ar.byline}` : null}
      </div>

      <div class="bc-archive-bookmark-title">
        🔖
        ${'\n'}
        <a class="bc-archive-bookmark-title-text" href="${`/bookmarks/view/?id=${ar.bookmark.id}`}">
          ${ar.bookmark.title}
        </a>
      </div>

      ${
        ar?.excerpt && !fullView
          ? html`
            <div class="bc-archive-excerpt">
              <${ExpandText} children=${ar?.excerpt} />
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


      ${fullView && ar.error
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
          <div class="bc-archive-html-content" dangerouslySetInnerHTML="${{ __html: ar.html_content }}" />
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
