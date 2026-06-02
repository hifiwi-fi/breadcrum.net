/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { render } from 'preact'
import { QueryProvider } from './query-provider.js'

/**
 * @typedef {object} MountPageOptions
 * @property {string} [selector]
 * @property {() => Promise<unknown> | unknown} [beforeMount]
 */

/**
 * @param {string | MountPageOptions | undefined} options
 * @returns {MountPageOptions & { selector: string }}
 */
function normalizeMountPageOptions (options) {
  if (typeof options === 'string' || options === undefined) {
    return {
      selector: options ?? '.bc-main',
    }
  }

  /** @type {MountPageOptions & { selector: string }} */
  const normalizedOptions = {
    selector: options.selector ?? '.bc-main',
  }
  if (options.beforeMount) normalizedOptions.beforeMount = options.beforeMount
  return normalizedOptions
}

/**
 * Mount a page component into a container, wrapped in QueryProvider.
 * @param {FunctionComponent} Page
 * @param {string | MountPageOptions} [options]
 */
export function mountPage (Page, options) {
  if (typeof window !== 'undefined') {
    const { selector, beforeMount } = normalizeMountPageOptions(options)
    const container = document.querySelector(selector)
    if (!container) return

    const renderPage = () => {
      render(html`<${QueryProvider}><${Page} /><//>`, container)
    }

    if (!beforeMount) {
      renderPage()
      return
    }

    Promise.resolve(beforeMount())
      .catch(err => {
        console.warn('Page preparation failed:', err)
      })
      .finally(renderPage)
  }
}
