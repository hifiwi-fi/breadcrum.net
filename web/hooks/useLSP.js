/* eslint-env browser */
import { useEffect, useState } from 'uland-isomorphic'
import lsp from 'local-storage-proxy'
import { defaultFrontendFlags } from '../../plugins/flags/frontend-flags.js'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: process.env.HOST,
    transport: process.env.TRANSPORT,
    sensitive: false,
    flags: defaultFrontendFlags
  },
  lspReset: 6
})

if (typeof window !== 'undefined') {
  window.state = state
}

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
