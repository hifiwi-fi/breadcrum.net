import { Component, html } from 'uland-isomorphic'

export const sensitive = Component(({
  sensitive = false,
  onClick = () => {}
}) => {
  return html`
    <span onClick=${onClick} class="${sensitive ? 'bc-sensitive' : 'bc-unsensitive'}" onClick=${onClick}>
      ${sensitive
        ? '🤫'
        : '🫥'
        }
    </span>`
})
