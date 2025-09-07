/// <reference lib="dom" />

/**
 * @import { TypeUserRead } from '../../routes/api/user/schemas/schema-user-read.js'
 */

// @ts-expect-error
import lsp from 'local-storage-proxy'
import { defaultFrontendFlags } from '../../plugins/flags/frontend-flags.js'

/**
 * @typedef {typeof defaultFrontendFlags} FrontendFlags
 */

/**
 * @typedef {object} StateType
 * @property {TypeUserRead | null} user
 * @property {string} apiUrl
 * @property {string} host
 * @property {string} transport
 * @property {boolean} sensitive
 * @property {boolean} toread
 * @property {boolean} starred
 * @property {FrontendFlags} flags
 */

/** @type {StateType & EventTarget} */
export const state = lsp('breadcrum', {
  defaults: {
    user: null,
    apiUrl: '/api',
    host: process.env['HOST'],
    transport: process.env['TRANSPORT'],
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
