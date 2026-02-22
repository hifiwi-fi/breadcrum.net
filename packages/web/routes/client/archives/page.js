/** @import { PageFunction } from '@domstack/static' */
/** @import { RootLayoutVars, PageReturn } from '../layouts/root/root.layout.js' */
import { html } from 'htm/preact'
import { Page } from './client.js'
import { QueryProvider } from '../lib/query-provider.js'

/** @type {PageFunction<RootLayoutVars, PageReturn>} */
export default () => {
  return html`<${QueryProvider}><${Page} /><//>`
}
