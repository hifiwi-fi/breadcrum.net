/* eslint-env browser */
import { createContext, useContext } from 'uland-isomorphic'
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

const StateContext = createContext()

StateContext.provide(state)

const listener = (ev) => { StateContext.provide(state) }
state.addEventListener('update', listener)

// TODO: look into this: https://usehooks.com/useLocalStorage/

export function useLSP () {
  const lsp = useContext(StateContext)

  return lsp
}
