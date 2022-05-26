import { html } from 'uland-isomorphic'
import { page } from './client.js'

export default async function () {
  return html`
  ${page()}
  `
}
