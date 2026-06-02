import getBookmarklet from '@breadcrum/bookmarklet'
import { version as bookmarkletVersion } from '@breadcrum/bookmarklet/dist/version.js'

/**
 * @param {object} params
 * @param {string} params.transport
 * @param {string} params.host
 * @returns {{ bookmarklet: string, version: string }}
 */
export function createBookmarkletDocsData ({ transport, host }) {
  return {
    bookmarklet: getBookmarklet({
      TRANSPORT: transport,
      HOST: host,
      WINDOW_TITLE: '🥖 Breadcrum',
    }),
    version: bookmarkletVersion,
  }
}
