/// <reference lib="dom" />
/**
 * @import { StateType } from './state.js'
 */

/* eslint-env browser */
// @ts-expect-error
import { useEffect, useState } from 'uland-isomorphic'
import { state } from './state.js'

/**
 * @returns {StateType}
 */
export function useLSP () {
  /** @type {[StateType, (newState: StateType) => void]} */
  const [lsp, setLSP] = useState(state)
  useEffect(() => {
    /** @param {Event} _ev */
    const listener = (_ev) => { setLSP(state) }
    state.addEventListener('update', listener)

    return () => {
      state.removeEventListener('update', listener)
    }
  }, [state])

  return lsp
}
