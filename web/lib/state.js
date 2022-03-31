import lsp from 'local-storage-proxy'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    disableRegistration: true
  },
  lspReset: 1
})

if (typeof window !== 'undefined') {
  window.state = state
}
