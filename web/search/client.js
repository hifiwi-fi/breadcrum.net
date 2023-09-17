/* eslint-env browser */
import { Component, html, render } from 'uland-isomorphic'
export const page = Component(() => {
  return html`
    <div>🔎 Search</div>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
