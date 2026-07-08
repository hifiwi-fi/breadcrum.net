/** @import { PageFunction } from '@domstack/static/types.ts' */
/** @import { RootLayoutVars, PageReturn } from '../../layouts/root/root.layout.js' */
import { html } from 'htm/preact'

/** @type {PageFunction<RootLayoutVars, PageReturn>} */
export default () => {
  return html`
    <div class="bc-cache-inspector">
      <h2>Cache Inspector</h2>
      <p>Loading Cache Storage details…</p>
    </div>
  `
}
