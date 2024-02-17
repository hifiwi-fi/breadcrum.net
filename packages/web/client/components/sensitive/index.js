import { Component, html } from 'uland-isomorphic'

export const sensitive = Component(({
  sensitive = false,
  onclick = () => {}
}) => {
  return html`
    <span class="${sensitive ? 'bc-sensitive' : 'bc-unsensitive'}" onclick=${onclick}>
      ${sensitive
        ? '🤫'
        : '🫥'
        }
    </span>`
})
