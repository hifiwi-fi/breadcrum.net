/// <reference lib="dom" />

/**
 * @import { ComponentChild, FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../routes/api/archives/schemas/schema-archive-read.js'
 */

import { html } from 'htm/preact'
import { ArchiveTitle } from '../archive-title/index.js'
import { ExpandText } from '../expand-text/index.js'
import { ResolveStatus } from '../resolve-status/index.js'

/** @typedef {{ label: string, value: ComponentChild }} ArchiveMetaItem */

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
  /** @param {string | Date | null | undefined} value */
  const formatDate = (value) => {
    if (!value) return null
    return (new Date(value)).toLocaleString()
  }

  const isResolving = Boolean(ar?.ready === false && !ar?.error)

  /** @typedef {{ label: string, value: ComponentChild }} FooterItem */
  /** @type {FooterItem[][]} */
  const footerRows = []

  /** @param {FooterItem[]} row */
  const addFooterRow = (row) => {
    const filteredRow = row.filter(item => item.value != null && item.value !== '')
    if (filteredRow.length > 0) {
      footerRows.push(filteredRow)
    }
  }

  // Row 1: Metadata fields
  addFooterRow([
    { label: 'Extraction', value: ar.extraction_method ? html`<code>${ar.extraction_method}</code>` : null },
    { label: 'Language', value: ar.language ? html`<code>${ar.language}</code>` : null },
    { label: 'Direction', value: ar.direction ? html`<code>${ar.direction}</code>` : null },
    { label: 'Length', value: ar.length != null ? ar.length.toLocaleString() : null },
  ])

  // Row 2: Status fields
  addFooterRow([
    { label: 'Done', value: typeof ar.done === 'boolean' ? (ar.done ? 'yes' : 'no') : null },
    { label: 'Ready', value: typeof ar.ready === 'boolean' ? (ar.ready ? 'yes' : 'no') : null },
  ])

  // Row 3: Timestamps
  addFooterRow([
    { label: 'Published', value: formatDate(ar.published_time) },
    { label: 'Created', value: formatDate(ar.created_at) },
    { label: 'Updated', value: formatDate(ar.updated_at) },
  ])

  const showFooter = Boolean(fullView && footerRows.length)

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
          <time datetime="${ar.published_time || ar.created_at}">
            ${(new Date(ar.published_time || ar.created_at)).toLocaleString()}
          </time>
        </a>
      </div>

      ${isResolving ? html`<${ResolveStatus} />` : null}

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

      ${showFooter
        ? html`
          <div class="bc-archive-footer">
            <div class="bc-archive-footer-grid">
              ${footerRows.map((row) => html`
                <div class="bc-archive-footer-row">
                  ${row.map((item) => html`
                    <div class="bc-archive-footer-item">
                      <span class="bc-archive-footer-label">${item.label}</span>
                      <span class="bc-archive-footer-value">${item.value}</span>
                    </div>
                  `)}
                </div>
              `)}
            </div>
          </div>
        `
        : null
      }
    </div>
  `
}
