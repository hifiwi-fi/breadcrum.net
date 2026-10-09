/** @import { SitePage } from '#client/types/site-page.js' */
import { html } from 'htm/preact'
import { Page } from './client.js'

/** @type {SitePage<'docs'>} */
export default () => {
  return html`<${Page} />`
}
