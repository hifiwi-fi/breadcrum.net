/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'
import { unreadIcon } from '../unread/index.js'
import { star } from '../star/index.js'

export const bookmarkView = Component(({
  bookmark: b,
  handleEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-bookmark-view">
      <div>
        ${unreadIcon(b.toread)}
        ${star(b.starred)}
        <a class="${b.toread ? 'bc-bookmark-title-toread' : null}" href="${b.url}" target="_blank">${b.title}</a>
      </div>
      <div class="bc-bookmark-url-display"><a href="${b.url}">${b.url}</a></div>
      ${b.note ? html`<div>${b.note}</div>` : null}
      <div>
      ${b.tags?.length > 0
        ? html`
          <div class="bc-tags-display">
            🏷
            ${b.tags.map(tag => html`<a href=${`/tags/t/?tag=${tag}`}>${tag}</a> `)}
          </div>`
        : null
      }
      <div class="bc-date">
        <a href="${`./b/?id=${b.id}`}">
          <time datetime="${b.created_at}">
            ${(new Date(b.created_at)).toLocaleString()}
          </time>
        </a>
      </div>
      ${b.sensitive ? html`<div>'🤫'</div>` : null}
      <div>
        <button onClick=${handleEdit}>edit</button>
      </div>
    </div>`
})
