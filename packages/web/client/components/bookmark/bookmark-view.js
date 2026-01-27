/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */

import { html } from 'htm/preact'
import { ToRead } from '../toread/index.js'
import { Star } from '../star/index.js'
import { Sensitive } from '../sensitive/index.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useQuery } from '../../hooks/useQuery.js'
import { ExpandText } from '../expand-text/index.js'
import { ResolveStatus } from '../resolve-status/index.js'
import cn from 'classnames'

/**
 * @typedef {object} BookmarkViewProps
 * @property {TypeBookmarkReadClient} bookmark
 * @property {() => void} [onEdit]
 * @property {() => void} [onToggleToread]
 * @property {() => void} [onToggleStarred]
 * @property {() => void} [onToggleSensitive]
 */

/**
 * @type {FunctionComponent<BookmarkViewProps>}
 */
export const BookmarkView = ({
  bookmark: b,
  onEdit = () => {},
  onToggleToread = () => {},
  onToggleStarred = () => {},
  onToggleSensitive = () => {},
}) => {
  const window = useWindow()
  const { pushState } = useQuery()
  const isResolving = Boolean(
    b?.done === false ||
    b?.archives?.some(archive => archive?.ready === false && !archive?.error) ||
    b?.episodes?.some(episode => episode?.ready === false && !episode?.error)
  )
  const visibleArchives = (b?.archives ?? []).filter(archive => !archive?.error)
  const visibleEpisodes = (b?.episodes ?? []).filter(episode => !episode?.error)

  const onPageNav = (/** @type{MouseEvent} */ ev) => {
    const target = ev?.currentTarget
    const newHref = target && 'href' in target ? target.href : undefined
    if (window && typeof newHref === 'string') {
      const url = new URL(window.location.href)
      const newUrl = new URL(newHref)

      if (url.pathname === newUrl.pathname) {
        ev.preventDefault()
        pushState(newHref)
      }
    } else {
      console.warn('Missing window or href', { window, newHref })
    }
  }

  return html`
    <div class="bc-bookmark-view">
      <div class="bc-bookmark-title-line">
        <${ToRead} toread=${b.toread} onToggleRead=${onToggleToread} />
        ${'\n'}
        <${Star} starred=${b.starred} onToggleStar=${onToggleStarred} />
        ${'\n'}
        <${Sensitive} sensitive=${b.sensitive} onToggleSensitive=${onToggleSensitive} />
        ${'\n'}
        <span>
          <a class="${cn({
            'bc-bookmark-title': true,
            'bc-bookmark-title-toread': b.toread,
          })}"
            href="${b.url}"
            target="_blank"
          >
            ${b.title}
          </a>
        </span>
      </div>
      <div class="bc-bookmark-url-display"><a href="${b.url}">${b.url.replace(/^https?:\/\//, '')}</a></div>
        ${b.note ? html`<div class='bc-bookmark-note-display'>${b?.note?.trim()?.split('\n\n').map(note => html`<p>${note}</p>`)}</div>` : null}
        ${b.summary
          ? html`<div class='bc-bookmark-summary-display'>
              <${ExpandText} children=${b?.summary?.trim()?.split('\n\n').map(summary => html`<p>${summary}</p>`)} />
            </div>`
          : null}
      <div>
        ${b.tags?.length > 0
          ? html`
            <div class="bc-tags-display">
              🏷
              ${b.tags.map(tag => html` <a onClick="${onPageNav}" href=${`/bookmarks/?tag=${tag}`}>${tag}</a> `)}
            </div>`
          : null
        }
      </div>
      <div class='bc-bookmark-entity-enumeration'>
        ${visibleArchives.length > 0
          ? html`<div class='bc-bookmark-entity bc-archive-entity'>🗄️ <a href="${visibleArchives.length > 1 ? `/archives?bid=${b.id}` : `/archives/view?id=${visibleArchives[0]?.id}`}">${visibleArchives.length} archive${visibleArchives.length > 1 ? 's' : ''}</a></div>`
          : null
        }
        ${visibleEpisodes.length > 0
          ? html`<div class='bc-bookmark-entity bc-episode-entity'>📼 <a href="${visibleEpisodes.length > 1 ? `/episodes?bid=${b.id}` : `/episodes/view?id=${visibleEpisodes[0]?.id}`}">${visibleEpisodes.length} episode${visibleEpisodes.length > 1 ? 's' : ''}</a></div>`
          : null
        }
        ${isResolving ? html`<${ResolveStatus} />` : null}
      </div>
      ${b.archive_urls?.length > 0
        ? html`${b.archive_urls.map(
            url => html`<div class="bc-bookmark-archive-url-display">🫙 <a href="${url}">${url.replace(/^https?:\/\//, '')}</a></div>`
          )
      }`
        : null
      }
      <div class="bc-date">
        <a href="${`/bookmarks/view/?id=${b.id}`}">
          <time datetime="${b.created_at}">
            ${(new Date(b.created_at)).toLocaleString()}
          </time>
        </a>
      </div>
      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
    </div>
    `
}
