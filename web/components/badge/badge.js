import { html } from 'uland-isomorphic'

export function badge (text) {
  return html`
  <div class="bc-badge">${text}</div>
  `
}
