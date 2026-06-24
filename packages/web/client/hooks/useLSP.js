/// <reference lib="dom" />
/**
 * @import { StateType } from './state.js'
 */

import { useState, useEffect, useCallback } from 'preact/hooks'
import { state } from './state.js'

/**
 * @returns {StateType}
 */
export function useLSP () {
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    /** @param {Event} _ev */
    const listener = (_ev) => { forceUpdate() }
    state.addEventListener('update', listener)
    return () => {
      state.removeEventListener('update', listener)
    }
  }, [state])

  return state
}
