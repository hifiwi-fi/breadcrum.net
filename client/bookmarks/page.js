/** @import { SitePage } from '#client/types/site-page.js' */
import { html } from 'htm/preact'
import { Page } from './client.js'
import { QueryProvider } from '../lib/query-provider.js'

/** @type {SitePage<'root'>} */
export default () => {
  return html`<${QueryProvider}><${Page} /><//>`
}
