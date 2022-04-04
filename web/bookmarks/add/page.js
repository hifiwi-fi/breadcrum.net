import { html } from 'uland-isomorphic'
import { addBookmarkPage } from './client.js'

export default async function () {
  return html`
  ${addBookmarkPage()}
  `
}
