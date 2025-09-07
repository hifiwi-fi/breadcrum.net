/// <reference lib="dom" />
/* eslint-env browser */

import { useCallback } from 'preact/hooks'
import { signal } from '@preact/signals'
import { useWindow } from './useWindow.js'

const querySignal = signal(/** @type {URLSearchParams | null} */ (null))

if (typeof window !== 'undefined') {
  querySignal.value = new URLSearchParams(window.location.search)
  window.addEventListener('popstate', /** @param {Event} _ev */ (_ev) => {
    querySignal.value = new URLSearchParams(window.location.search)
  })
}

/**
 * @returns {{
 *   query: URLSearchParams | null,
 *   pushState: (url: string) => void
 * }}
 */
export function useQuery () {
  const window = useWindow()

  const query = querySignal.value

  const pushState = useCallback(/** @param {string} url */ (url) => {
    const searchParams = (new URL(url)).search
    querySignal.value = new URLSearchParams(searchParams)
    window?.history.pushState({}, '', url)
  }, [window])

  return { query, pushState }
}

/**
 * @template T
 * @param {T} [defaultValue] - Default value to return when parsing fails
 * @returns {{
 *   searchParams: T | null,
 *   pushState: (url: string) => void
 * }}
 */
export function useSearchParams (defaultValue) {
  const { query, pushState } = useQuery()

  /** @type {T | null} */
  let searchParams = null

  if (query) {
    try {
      const urlParams = new URLSearchParams(query)
      const parsed = Object.fromEntries(urlParams.entries())
      searchParams = /** @type {T} */ (parsed)
    } catch (error) {
      console.warn('Failed to parse search params:', error)
      searchParams = defaultValue || null
    }
  } else {
    searchParams = defaultValue || null
  }

  return { searchParams, pushState }
}
