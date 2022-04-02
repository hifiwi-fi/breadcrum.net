import { html } from 'uland-isomorphic'
import { bookmarksPage } from './client.js'

export default async function () {
  return html`
  ${bookmarksPage()}
  `
}
