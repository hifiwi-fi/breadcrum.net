/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { mountPage } from '../lib/mount-page.js'

/** @type {FunctionComponent} */
export const Page = () => {
  return html`
    <div class="bc-search-landing">
      <div class="bc-search-landing-content">
        <div class="bc-search-landing-links">
          <div class="bc-search-landing-link">
            <span aria-hidden="true">🔖</span>
            <a href="/search/bookmarks/">Search bookmarks</a>
          </div>
          <div class="bc-search-landing-link">
            <span aria-hidden="true">🗄️</span>
            <a href="/search/archives/">Search archives</a>
          </div>
          <div class="bc-search-landing-link">
            <span aria-hidden="true">📼</span>
            <a href="/search/episodes/">Search episodes</a>
          </div>
        </div>
      </div>
    </div>
  `
}

mountPage(Page)
