/* eslint-env browser */
import { useEffect, useState } from 'uland-isomorphic'
import { state } from '../lib/state.js'

// TODO: look into this: https://usehooks.com/useLocalStorage/

export function useLSP () {
  const [lsp, setLSP] = useState(state)
  useEffect(() => {
    const listener = (ev) => { setLSP(state) }
    state.addEventListener('update', listener)

    return () => {
      state.removeEventListener('update', listener)
    }
  }, [state])

  return lsp
}
