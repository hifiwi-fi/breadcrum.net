/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

export const archiveTitle = Component(
  (
    {
      archive: { id, url, title, site_name, length, excerpt, languange, byline, direction, error, ready } = {},
      small,
      big,
    } = {}
  ) => {
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
)
