/* eslint-env browser */
import { Component, html } from 'uland-isomorphic'

export const feedDisplay = Component(({
  feed: f = {},
  feeds = [],
  onEdit = () => {}
} = {}) => {
  return html`
    <div class="bc-feed-display">

      <div>
        title: ${f.title}
      </div>

      <div>
        description: ${f.description}
      </div>

      <div>
        image_url: ${f.image_url}
      </div>

      <div>
        explicit: ${f.explicite}
      </div>

      <div>
        created_at: ${f.created_at}
      </div>

      <div>
        updated_at: ${f.updated_at}
      </div>


      <div>
        id: ${f.id}
      </div>

      <div>
        default: ${f.default}
      </div>

      <div>
        feed_url: ${f.feed_url}
      </div>

      <label for="feed-select">Feed:</label>
      <select id="feed-select">
        ${feeds.map(f => html.for(f, f.id)`
          <option value="${f.id}">${f.title}</option>
        `)}
      </select>

      <div>
        <button onClick=${onEdit}>Edit</button>
      </div>
    </div>
  `
})
