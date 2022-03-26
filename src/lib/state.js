import lsp from 'local-storage-proxy'

export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: 'http://localhost:3050'
  },
  lspReset: false
})

console.log('setting state')
if (typeof window !== 'undefined') {
  console.log('setting state')
  window.state = state
}