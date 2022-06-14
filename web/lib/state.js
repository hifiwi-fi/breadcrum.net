import lsp from 'local-storage-proxy'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: 'breadcrum.net',
    disableRegistration: true,
    sensitive: false
  },
  lspReset: 1
})

if (typeof window !== 'undefined') {
  window.state = state
}
