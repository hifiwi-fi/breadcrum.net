/// <reference lib="dom" />

import { useCallback, useMemo } from 'preact/hooks'
import { signal, useComputed } from '@preact/signals'
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
 *   searchParamsAll: URLSearchParams | null,
 *   pushState: (url: string) => void
 * }}
 */
export function useSearchParamsAll () {
  const window = useWindow()

  const searchParamsAll = querySignal.value

  const pushState = useCallback(/** @param {string} url */ (url) => {
    const searchParams = (new URL(url)).search
    querySignal.value = new URLSearchParams(searchParams)
    window?.history.pushState({}, '', url)
  }, [window])

  return { searchParamsAll, pushState }
}

/**
 * Subscribe to specific URL search param keys and get a stable loop-safe setter.
 *
 * Reading: a `computed` signal is derived from only the watched keys. The
 * component re-renders only when one of those keys actually changes value, not
 * on every URL param change. Passing `[]` means the component never re-renders
 * due to URL changes (useful when you only need `pushState`).
 *
 * Writing — two distinct primitives:
 *
 *   `setParams(updates, { replace? })` — surgical merge. Updates only the named
 *   keys, leaving all other params intact. Defaults to replaceState so
 *   cursor-style pagination updates don't pollute browser history. Pass
 *   `{ replace: false }` to push onto the history stack instead. Use this for
 *   in-page state changes where the destination URL is built incrementally.
 *
 *   `pushState(url)` — full-URL navigation. Replaces the entire search string
 *   with whatever is in the provided URL. Use this when the destination URL has
 *   already been fully constructed (e.g. from a pre-built anchor href) and you
 *   want to intercept the click for SPA navigation instead of a full page load.
 *
 * Loop safety: if a write produces the same query string that is already in the
 * signal, no new signal value is emitted and TanStack Query sees no key change.
 *
 * @param {string[]} keys - The param keys to watch and manage
 * @returns {{
 *   params: Record<string, string | null>,
 *   setParams: (updates: Record<string, string | null>, options?: { replace?: boolean }) => void,
 *   pushState: (url: string) => void
 * }}
 */
export function useSearchParams (keys) {
  const window = useWindow()

  // Computed signal scoped to the watched keys. It re-evaluates whenever
  // querySignal changes, but only notifies subscribers when a watched key's
  // value actually changes. JSON.stringify produces a stable primitive so
  // Preact's === equality check works correctly.
  const paramsSignal = useComputed(() => {
    const allParams = querySignal.value
    /** @type {Record<string, string | null>} */
    const result = {}
    for (const key of keys) {
      result[key] = allParams?.get(key) ?? null
    }
    return JSON.stringify(result)
  })

  // Subscribes the component to paramsSignal — re-renders only when it changes.
  const paramsJson = paramsSignal.value

  const params = useMemo(
    () => /** @type {Record<string, string | null>} */ (JSON.parse(paramsJson)),
    [paramsJson]
  )

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

  const pushState = useCallback(/** @param {string} url */ (url) => {
    const searchParams = (new URL(url)).search
    querySignal.value = new URLSearchParams(searchParams)
    window?.history.pushState({}, '', url)
  }, [window])

  return { params, setParams, pushState }
}
