/// <reference lib="dom" />
/* eslint-disable camelcase */

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import cn from 'classnames'

/**
 * @typedef {object} Episode
 * @property {string} [id]
 * @property {string} [url]
 * @property {boolean} [error]
 * @property {boolean} [ready]
 * @property {'redirect' | 'raw' | 'b2_file'} [type]
 * @property {'video' | 'audio'} [medium]
 * @property {string} [display_title]
 */

/**
 * @typedef {object} EpisodeTitleProps
 * @property {Episode} [episode]
 * @property {boolean} [small]
 */

/**
 * @type {FunctionComponent<EpisodeTitleProps>}
 */
export const EpisodeTitle = ({
  episode: { id, url, error, ready, type, medium, display_title } = {},
  small,
}) => {
  const href = small === true
    ? `/episodes/view/?id=${id}`
    : url

  return html`
  <div class="${cn({
    'bc-episode-title-container': true,
    'bc-episode-title-container-small': small,
  })}">
      ${
        error
          ? '❌'
          : ready
            ? '✅'
            : '⏱️'
      }
      ${'\n'}
      ${
        type === 'redirect'
        ? '☁️'
        : type === 'raw'
          ? '🍣'
          : type === 'b2_file'
            ? '🗄'
            : null
      }
      ${'\n'}
      ${
        medium === 'video'
          ? '📼'
          : medium === 'audio'
            ? '💿'
            : null
      }
      ${'\n'}
      <a href="${href}" target="${small ? null : '_blank'}">
        ${display_title}
      </a>
    </div>
`
}
