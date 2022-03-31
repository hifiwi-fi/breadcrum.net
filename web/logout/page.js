import { html } from 'uland-isomorphic'
import { logout } from './client.js'

export default async function () {
  return html`${logout()}`
}
