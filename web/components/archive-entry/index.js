/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

export const archiveEntry = Component(
  (
    {
      archive: { id, url, title, site_name, length, excerpt, languange, byline, direction, error, ready } = {},
      small
    } = {}
  ) => {
    const href = small === true
      ? `/archives/view/?id=${id}`
      : url

    return html`
    <div class="${cn({
      'bc-archives-title-container-small': small
    })}">
      <div class='bc-archives-title-container'>
        ${
          error
            ? '❌'
            : ''
        }
        🗄️
        <a href="${href}" target="${small ? null : '_blank'}">
          ${title}
        </a>
      </div>
      ${excerpt
        ? html`
          <p class="bc-archives-excerpt">${excerpt}</p>`
        : null
      }
    </div>
  `
  }
)
