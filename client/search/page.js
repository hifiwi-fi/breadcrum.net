/** @import { SitePage } from '#client/types/site-page.js' */
import { html } from 'htm/preact'
import { Page } from './client.js'

/** @type {SitePage<'root'>} */
export default () => {
  return html`<${Page} />`
}
