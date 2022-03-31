import { html } from 'uland-isomorphic'
import { loginPage } from './client.js'

export default async function () {
  return html`
  ${loginPage()}
  `
}
