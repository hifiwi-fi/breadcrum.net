/// <reference lib="dom" />

import { useCallback, useMemo } from 'preact/hooks'
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
 * Subscribe to specific URL search param keys and get a stable loop-safe setter.
 *
 * Reading: only the requested keys are returned — unrelated param changes do not
 * cause re-renders in components that use this hook for a narrow set of keys.
 *
 * Writing: `setParams` merges updates into the current URL params (set or delete
 * individual keys, leaving all others intact). Defaults to `replaceState` so
 * cursor-style pagination updates don't pollute browser history. Pass
 * `{ replace: false }` to use `pushState` instead.
 *
 * Loop safety: if a write produces the same query string that is already in the
 * signal, no new signal value is emitted and TanStack Query sees no key change.
 *
 * @param {string[]} keys - The param keys to watch and manage
 * @returns {{
 *   params: Record<string, string | null>,
 *   setParams: (updates: Record<string, string | null>, options?: { replace?: boolean }) => void
 * }}
 */
export function useSearchParams (keys) {
  const window = useWindow()
  const allParams = querySignal.value

  const keysString = keys.join(',')
  const params = useMemo(() => {
    /** @type {Record<string, string | null>} */
    const result = {}
    for (const key of keys) {
      result[key] = allParams?.get(key) ?? null
    }
    return result
  }, [allParams, keysString])

  const setParams = useCallback((/** @type {Record<string, string | null>} */ updates, { replace = true } = {}) => {
    const next = new URLSearchParams(querySignal.value?.toString() ?? '')
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    const nextStr = next.toString()
    // Loop safety: only emit a new signal value if the query string actually changed.
    if (nextStr === (querySignal.value?.toString() ?? '')) return
    const url = nextStr ? `.?${nextStr}` : '.'
    querySignal.value = next
    if (replace) {
      window?.history.replaceState(null, '', url)
    } else {
      window?.history.pushState({}, '', url)
    }
  }, [window])

  return { params, setParams }
}
