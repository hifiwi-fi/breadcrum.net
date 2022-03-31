import { html } from 'uland-isomorphic'
import { homepage } from './client.js'

export default function indexPage () {
  return html`${homepage()}`
}
