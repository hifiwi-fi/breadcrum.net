/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { render } from 'preact'
import { QueryProvider } from './query-provider.js'

/**
 * Mount a page component into a container, wrapped in QueryProvider.
 * @param {FunctionComponent} Page
 * @param {string} [selector='.bc-main']
 */
export function mountPage (Page, selector = '.bc-main') {
  if (typeof window !== 'undefined') {
    const container = document.querySelector(selector)
    if (container) {
      render(html`<${QueryProvider}><${Page} /><//>`, container)
    }
  }
}
