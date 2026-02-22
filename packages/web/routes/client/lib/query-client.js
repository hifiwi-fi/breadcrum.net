/// <reference lib="dom" />

import { QueryClient } from '@tanstack/preact-query'

/**
 * @typedef {typeof globalThis & { __bcQueryClient?: QueryClient }} QueryClientGlobal
 */

const globalScope = /** @type {QueryClientGlobal} */ (globalThis)

/** @type {QueryClient | null} */
let localClient = null

/**
 * Returns a shared QueryClient instance.
 * @returns {QueryClient}
 */
export function getQueryClient () {
  if (localClient) return localClient
  if (globalScope.__bcQueryClient) {
    localClient = globalScope.__bcQueryClient
    return localClient
  }

  localClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
        refetchOnWindowFocus: false,
      },
    },
  })

  globalScope.__bcQueryClient = localClient
  return localClient
}
