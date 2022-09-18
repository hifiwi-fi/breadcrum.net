/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import cn from 'classnames'

export const episodeTitle = Component(({
  episode: e,
  small
} = {}) => {
  console.log(e)
  const href = small === true
    ? `/episodes/?id=${e.id}`
    : e.url

  return html`
    <div class="${cn({
      'bc-episode-title-container': true,
      'bc-episode-title-small': small
    })}">
        ${
          e.ready ? '✅' : '⏱'
        }
        ${
          e.error ? '❌' : null
        }
        ${e.type === 'redirect'
          ? '☁️'
          : e.type === 'raw'
            ? '🍣'
            : e.type === 'b2_file'
              ? '🗄'
              : null
        }
        ${
          e.medium === 'video'
            ? '📼'
            : e.medium === 'audio'
              ? '💿'
              : null
        }
        <a class="bc-episode-title" href="${href}" target="_blank">
          ${e.display_title}
        </a>
      </div>
  `
})
