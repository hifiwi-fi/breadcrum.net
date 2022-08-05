import lsp from 'local-storage-proxy'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: 'breadcrum.net',
    sensitive: false
  },
  lspReset: 5
})

if (typeof window !== 'undefined') {
  window.state = state
}
