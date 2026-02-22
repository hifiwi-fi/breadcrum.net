/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeArchiveReadClient } from '../../../api/archives/schemas/schema-archive-read.js'
 */

import { html } from 'htm/preact'
import cn from 'classnames'

/**
 * Archive title component
 * @type {FunctionComponent<{
 *   archive?: TypeArchiveReadClient,
 *   small?: boolean,
 *   big?: boolean
 * }>}
 */
export const ArchiveTitle = ({
  archive = {},
  small,
  big,
} = {}) => {
  const { id, url, title } = archive
  // Handle error property safely - check if it exists on the archive object
  const error = 'error' in archive ? archive.error : undefined
  const href = small === true
    ? `/archives/view/?id=${id}`
    : url

  return html`
    <div class="${cn({
      'bc-archives-title-container-small': small,
    })}">
      <div class='bc-archives-title-container'>
        ${
          big
            ? html`
            <h1 class='bc-archives-big-title'>
              <a href="${href}" target="${small ? null : '_blank'}">
                ${title}
              </a>
            </h1>
            `
            : html`🗄️ ${
                error
                  ? '❌'
                  : null
                }
                <a href="${`/archives/view/?id=${id}`}">${title}</a>`
        }
      </div>
    </div>
  `
}
