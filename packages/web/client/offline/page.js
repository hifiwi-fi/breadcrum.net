/** @import { PageFunction } from '@domstack/static' */
/** @import { RootLayoutVars, PageReturn } from '../layouts/root/root.layout.js' */

import { html } from 'htm/preact'

/** @type {PageFunction<RootLayoutVars, PageReturn>} */
export default () => {
  return html`
    <section class="bc-offline-page">
      <div class="bc-offline-empty-state">
        <div class="bc-offline-empty">This page is not available offline.</div>
        <div><a href="/bookmarks/">Go to bookmarks</a></div>
      </div>
    </section>
  `
}
