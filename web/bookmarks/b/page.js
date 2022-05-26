import { html } from 'uland-isomorphic'
import { page } from './client.js'

export default () => {
  return html`${page()}`
}
