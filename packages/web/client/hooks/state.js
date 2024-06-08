import lsp from 'local-storage-proxy'
import { defaultFrontendFlags } from '../../plugins/flags/frontend-flags.js'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: process.env.HOST,
    transport: process.env.TRANSPORT,
    sensitive: false,
    toread: false,
    starred: false,
    flags: defaultFrontendFlags,
  },
  lspReset: 6,
})

if (typeof window !== 'undefined') {
  window.state = state
}
