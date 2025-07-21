/// <reference lib="dom" />

// @ts-expect-error
import { useCallback, createContext, useContext } from 'uland-isomorphic'
import { useWindow } from './useWindow.js'

const QueryContext = createContext()

if (typeof window !== 'undefined') {
  QueryContext.provide(new URLSearchParams(window.location.search))
  window.addEventListener('popstate', /** @param {Event} _ev */ (_ev) => {
    QueryContext.provide(new URLSearchParams(window.location.search))
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
  /** @type {URLSearchParams | null} */
  const query = useContext(QueryContext)

  const pushState = useCallback(/** @param {string} url */ (url) => {
    const searchParams = (new URL(url)).search
    QueryContext.provide(new URLSearchParams(searchParams))
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
