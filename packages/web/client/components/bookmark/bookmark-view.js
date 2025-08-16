/// <reference lib="dom" />
/* eslint-env browser */

// @ts-expect-error
import { Component, html } from 'uland-isomorphic'
import { ToRead } from '../toread/index.js'
import { Star } from '../star/index.js'
import { Sensitive } from '../sensitive/index.js'
import { useWindow } from '../../hooks/useWindow.js'
import { useQuery } from '../../hooks/useQuery.js'
import { expandText } from '../expand-text/index.js'
import cn from 'classnames'

export const bookmarkView = Component(({
  bookmark: b,
  onEdit = () => {},
  onToggleToread = () => {},
  onToggleStarred = () => {},
  onToggleSensitive = () => {},
} = {}) => {
  const window = useWindow()
  const { pushState } = useQuery()

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
        ${ToRead({
          toread: b.toread,
          onclick: onToggleToread,
        })}
        ${Star({
          starred: b.starred,
          onclick: onToggleStarred,
        })}
        ${Sensitive({
          sensitive: b.sensitive,
          onclick: onToggleSensitive,
        })}
        <a class="${cn({
          'bc-bookmark-title': true,
          'bc-bookmark-title-toread': b.toread,
        })}"
           href="${b.url}"
           target="_blank"
        >
          ${b.title}
        </a>
      </div>
      <div class="bc-bookmark-url-display"><a href="${b.url}">${b.url.replace(/^https?:\/\//, '')}</a></div>
      ${b.note ? html`<div class='bc-bookmark-note-display'>${b?.note?.trim()?.split('\n\n').map(note => html`<p>${note}</p>`)}</div>` : null}
      ${b.summary
        ? html`<div class='bc-bookmark-summary-display'>
            ${expandText({
              children: b?.summary?.trim()?.split('\n\n').map(summary => html`<p>${summary}</p>`),
            })}
          </div>`
        : null}
      <div>
      ${b.tags?.length > 0
        ? html`
          <div class="bc-tags-display">
            🏷
            ${b.tags.map(tag => html` <a onclick="${onPageNav}" href=${`/bookmarks/?tag=${tag}`}>${tag}</a> `)}
          </div>`
        : null
      }
      <div class='bc-bookmark-entity-enumeration'>
        ${b.archives?.length > 0 && b.archives.some(a => a.ready)
          ? html`<div class='bc-bookmark-entity bc-archive-entity'>🗄️ <a href="${b.archives?.length > 1 ? `/archives?bid=${b.id}` : `/archives/view?id=${b.archives?.[0]?.id}`}">${b.archives?.length} archive${b.archives?.length > 1 ? 's' : ''}</a><div>`
          : null
        }
        ${b.episodes?.length > 0 && b.episodes.some(e => e.ready)
          ? html`<div class='bc-bookmark-entity bc-episode-entity'>📼 <a href="${b.episodes?.length > 1 ? `/episodes?bid=${b.id}` : `/episodes/view?id=${b.episodes?.[0]?.id}`}">${b.episodes?.length} episode${b.episodes?.length > 1 ? 's' : ''}</a><div>`
          : null
        }
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
    </div>`
})
