import lsp from 'local-storage-proxy'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: 'breadcrum.net',
    registration: process.env.REGISTRATION,
    sensitive: false
  },
  lspReset: 4
})

if (typeof window !== 'undefined') {
  window.state = state
}
