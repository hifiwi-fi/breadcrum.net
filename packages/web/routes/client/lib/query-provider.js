/// <reference lib="dom" />

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 */

import { html } from 'htm/preact'
import { QueryClientProvider } from '@tanstack/preact-query'
import { getQueryClient } from './query-client.js'

/** @type {FunctionComponent<{ children: ComponentChild }>} */
export const QueryProvider = ({ children }) => {
  const client = getQueryClient()
  return html`<${QueryClientProvider} client=${client}>${children}<//>`
}
