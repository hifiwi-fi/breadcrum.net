/// <reference lib="dom" />

/** @import { Ref } from 'preact' */
import { useRef, useReducer, useCallback, useEffect } from 'preact/hooks'

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {{ error: Error | undefined, data: any | undefined }}
 */
export function useFetch (url, options) {
  /** @type {Ref<Record<string, any>>} */
  const cacheRef = useRef({})
  const ignoreRef = useRef(false)

  const initialState = {
    error: undefined,
    data: undefined,
  }

  /**
   * @param {{ error: Error | undefined, data: any | undefined }} state
   * @param {{ type: string, payload?: any }} action
   */
  const reducer = (state, action) => {
    switch (action.type) {
      case 'loading':
        return { ...initialState }
      case 'fetched':
        return { ...initialState, data: action.payload }
      case 'error':
        return { ...initialState, error: action.payload }
      default:
        return state
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState)

  const onFetch = useCallback(() => {
    return fetch(url, options)
  }, [url, options])

  useEffect(() => {
    if (typeof url !== 'string') return

    const fetchData = async () => {
      dispatch({ type: 'loading' })
      const cachedResponse = cacheRef.current?.[url]

      if (cachedResponse) {
        dispatch({ type: 'fetched', payload: cachedResponse })
        return
      }

      try {
        const res = await onFetch()

        if (!res.ok) {
          throw new Error(res.statusText)
        }

        const json = await res.json()
        if (cacheRef.current) {
          cacheRef.current[url] = json
        }

        if (ignoreRef.current === false) {
          dispatch({ type: 'fetched', payload: json })
        }
      } catch (e) {
        if (ignoreRef.current === false) {
          dispatch({ type: 'error', payload: e })
        }
      }
    }

    ignoreRef.current = false
    fetchData()

    return () => {
      ignoreRef.current = true
    }
  }, [url])

  return state
}
