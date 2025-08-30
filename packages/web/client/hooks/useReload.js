/// <reference lib="dom" />
/* eslint-env browser */

import { useState, useCallback } from 'preact/hooks'

/**
 * @typedef {object} UseReloadReturn
 * @property {number} signal - Counter that increments on each reload
 * @property {() => void} reload - Function to trigger a reload by incrementing the counter
 */

/**
 * Hook that provides a simple reload mechanism for triggering re-renders or data reloads
 * @returns {UseReloadReturn}
 */
export function useReload () {
  const [signal, setSignal] = useState(0)

  /** @type {() => void} */
  const reload = useCallback(() => {
    setSignal(prev => prev + 1)
  }, [])

  return { signal, reload }
}
