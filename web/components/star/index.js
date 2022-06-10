import { Component, html } from 'uland-isomorphic'

export const star = Component(({
  starred = false,
  onclick = () => {}
}) => {
  return html`
    <span class="${starred ? 'bc-starred' : 'bc-unstarred'}" onclick=${onclick}>
      ${starred
        ? '★'
        : '☆'
        }
    </span>`
})
