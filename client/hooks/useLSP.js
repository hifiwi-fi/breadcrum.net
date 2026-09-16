/// <reference lib="dom" />
/**
 * @import { StateType } from './state.js'
 */

import { useEffect } from 'preact/hooks'
import { state } from './state.js'
import { useReload } from './useReload.js'

/**
 * @returns {StateType}
 */
export function useLSP () {
  const { reload } = useReload()
  useEffect(() => {
    /** @param {Event} _ev */
    const listener = (_ev) => { reload() }
    state.addEventListener('update', listener)
    return () => {
      state.removeEventListener('update', listener)
    }
  }, [state])

  return state
}
