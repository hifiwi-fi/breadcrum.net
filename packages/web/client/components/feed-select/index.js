/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'

export const feedSelect = Component(({
  feeds
}) => {
  return html`
  <form class="bc-feed-select-form">
        <label for="feed-select">Select Feed:</label>
        <select id="feed-select">
          ${feeds.map(f => html.for(f, f.id)`
            <option value="${f.id}">${f.title}</option>
          `)}
        </select>
      </form>
  `
})
